const os = require("os");
const path = require("path");

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

module.exports = {
  getDataDir,
  getRuntimeDir,
  getRuntimeNodeModules,
};
