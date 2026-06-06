// Runtime DB helper.
// Native better-sqlite3 auto-install is disabled to avoid first-run downloads,
// build-tool prompts, and repeated runtime setup in the CLI.
// The app now prefers built-in/fallback drivers unless explicitly enabled.
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const BETTER_SQLITE3_VERSION = "12.6.2";

function getDataDir() {
  if (process.env.DATA_DIR) return process.env.DATA_DIR;
  return process.platform === "win32"
    ? path.join(process.env.APPDATA || os.homedir(), "9router")
    : path.join(os.homedir(), ".9router");
}

function getRuntimeDir() {
  return path.join(getDataDir(), "runtime");
}

function getRuntimeNodeModules() {
  return path.join(getRuntimeDir(), "node_modules");
}

function ensureRuntimeDir() {
  const dir = getRuntimeDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Minimal package.json so npm treats it as a project root
  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: "9router-runtime",
      version: "1.0.0",
      private: true,
      description: "User-writable runtime deps for 9router (better-sqlite3 native binary)",
    }, null, 2));
  }
  return dir;
}

function hasModule(name) {
  return fs.existsSync(path.join(getRuntimeNodeModules(), name, "package.json"));
}

function isBetterSqliteBinaryValid() {
  const binary = path.join(getRuntimeNodeModules(), "better-sqlite3", "build", "Release", "better_sqlite3.node");
  if (!fs.existsSync(binary)) return false;
  try {
    const fd = fs.openSync(binary, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    const magic = buf.toString("hex");
    if (process.platform === "linux") return magic.startsWith("7f454c46");
    if (process.platform === "darwin") return magic.startsWith("cffaedfe") || magic.startsWith("cefaedfe");
    if (process.platform === "win32") return magic.startsWith("4d5a");
    return true;
  } catch { return false; }
}

// Extract a short, user-friendly reason from npm stderr.
function summarizeNpmError(stderr = "") {
  const text = String(stderr);
  if (/ENOTFOUND|ETIMEDOUT|EAI_AGAIN|network|getaddrinfo/i.test(text)) return "No internet connection or registry unreachable";
  if (/EACCES|EPERM|permission denied/i.test(text)) return "Permission denied (check folder permissions)";
  if (/ENOSPC|no space/i.test(text)) return "Not enough disk space";
  if (/node-gyp|gyp ERR|python|MSBuild|Visual Studio|Xcode/i.test(text)) return "Missing build tools (Xcode CLT / Python / VS Build Tools)";
  if (/ETARGET|version.*not found/i.test(text)) return "Package version not found on registry";
  const m = text.match(/npm ERR! (.+)/);
  if (m) return m[1].slice(0, 200);
  const lastLine = text.trim().split(/\r?\n/).filter(Boolean).pop();
  return lastLine ? lastLine.slice(0, 200) : "Unknown error";
}

function runNpmInstall({ cwd, pkgs, extraArgs = [], timeout = 180000 }) {
  const args = ["install", ...pkgs, "--no-audit", "--no-fund", "--prefer-online", ...extraArgs];
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const res = spawnSync(npmCmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
    shell: process.platform === "win32",
    encoding: "utf8",
  });
  return { ok: res.status === 0, code: res.status, stderr: res.stderr || "", stdout: res.stdout || "" };
}

function npmInstall(pkgs, opts = {}) {
  const cwd = ensureRuntimeDir();
  const extra = opts.optional ? ["--no-save"] : [];
  if (!opts.silent) console.log("⏳ Installing optional native DB engine...");
  const res = runNpmInstall({ cwd, pkgs, extraArgs: extra, timeout: opts.timeout || 180000 });
  if (!res.ok && !opts.silent) {
    const reason = summarizeNpmError(res.stderr);
    console.warn("⚠️  Optional native DB engine install failed — continuing with built-in fallback");
    console.warn(`   Reason: ${reason}`);
    console.warn(`   Retry:  cd "${cwd}" && npm install ${pkgs.join(" ")}`);
  }
  return res.ok;
}

// Public: keep runtime dir available, but do NOT auto-install better-sqlite3.
// To force the optional native install, set 9ROUTER_INSTALL_BETTER_SQLITE3=1.
function ensureSqliteRuntime({ silent = false } = {}) {
  ensureRuntimeDir();

  const enabled = process.env["9ROUTER_INSTALL_BETTER_SQLITE3"] === "1";
  const ready = hasModule("better-sqlite3") && isBetterSqliteBinaryValid();

  if (ready) {
    if (!silent) console.log("✅ Optional native DB engine ready");
    return { betterSqlite: true, skipped: false };
  }

  if (!enabled) {
    if (!silent) console.log("ℹ️ Skipping optional better-sqlite3 install; using built-in DB fallback");
    return { betterSqlite: false, skipped: true };
  }

  const ok = npmInstall([`better-sqlite3@${BETTER_SQLITE3_VERSION}`], { optional: true, silent });
  return {
    betterSqlite: ok && hasModule("better-sqlite3") && isBetterSqliteBinaryValid(),
    skipped: false,
  };
}

// Inject runtime + bundled node_modules into NODE_PATH so child Node processes
// resolve sql.js (bundled in bin/app/node_modules) and better-sqlite3 (runtime).
function buildEnvWithRuntime(baseEnv = process.env) {
  const runtimeNm = getRuntimeNodeModules();
  const bundledNm = path.join(__dirname, "..", "app", "node_modules");
  const existing = baseEnv.NODE_PATH || "";
  const NODE_PATH = [runtimeNm, bundledNm, existing].filter(Boolean).join(path.delimiter);
  return { ...baseEnv, NODE_PATH };
}

module.exports = {
  ensureSqliteRuntime,
  buildEnvWithRuntime,
  getRuntimeDir,
  getRuntimeNodeModules,
  runNpmInstall,
  summarizeNpmError,
};
