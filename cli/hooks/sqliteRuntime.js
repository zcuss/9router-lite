const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { getRuntimeDir, getRuntimeNodeModules } = require("./runtimeEnv");

const BETTER_SQLITE3_VERSION = "12.6.2";

function ensureRuntimeDir() {
  const dir = getRuntimeDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const pkgPath = path.join(dir, "package.json");
  if (!fs.existsSync(pkgPath)) {
    fs.writeFileSync(pkgPath, JSON.stringify({
      name: "9router-runtime",
      version: "1.0.0",
      private: true,
      description: "User-writable runtime deps for 9router tray runtime",
    }, null, 2));
  }
  return dir;
}

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
  const res = runNpmInstall({ cwd, pkgs, extraArgs: extra, timeout: opts.timeout || 180000 });
  if (!res.ok && !opts.silent) {
    const reason = summarizeNpmError(res.stderr);
    console.warn(`⚠️ Optional runtime install failed: ${reason}`);
  }
  return res.ok;
}

module.exports = {
  BETTER_SQLITE3_VERSION,
  ensureRuntimeDir,
  getRuntimeDir,
  getRuntimeNodeModules,
  runNpmInstall,
  summarizeNpmError,
  npmInstall,
};
