#!/usr/bin/env node

// Postinstall must not install or warm up any SQLite/native DB runtime.
// CockroachDB/Postgres deployments only need DB_DRIVER/DATABASE_URL at app launch.
const { ensureTrayRuntime } = require("./trayRuntime");

console.log("[9router] DB runtime install skipped; using configured DB driver at launch");

try {
  ensureTrayRuntime({ silent: false });
} catch (e) {
  console.warn(`[9router] tray runtime skipped: ${e.message}`);
}

process.exit(0);
