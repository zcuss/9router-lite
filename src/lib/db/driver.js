import { ensureDirs, DATA_FILE } from "./paths.js";

// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._dbAdapter;
const PREFER_NATIVE_SQLITE = process.env.PREFER_NATIVE_SQLITE === "1";
const REQUESTED_DB_DRIVER = (process.env.DB_DRIVER || process.env.DATABASE_DRIVER || "").toLowerCase();
const HAS_DATABASE_URL = !!process.env.DATABASE_URL;

async function tryBunSqlite() {
  // Bun runtime only — built-in, no install needed
  if (!process.versions.bun) return null;
  try {
    const { createBunSqliteAdapter } = await import("./adapters/bunSqliteAdapter.js");
    return await createBunSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] bun:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function tryBetterSqlite() {
  // Optional native runtime. Keep this out of Next's webpack graph by using eval import.
  if (process.versions.bun) return null;
  try {
    const dynamicImport = (0, eval)("(p) => import(p)");
    const { createBetterSqliteAdapter } = await dynamicImport("./adapters/betterSqliteAdapter.js");
    return createBetterSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] better-sqlite3 unavailable: ${e.message}`);
    return null;
  }
}

async function tryNodeSqlite() {
  // Built-in since Node 22.5.0 — no install needed. Skip under Bun (no node:sqlite).
  if (process.versions.bun) return null;
  const [maj, min] = process.versions.node.split(".").map(Number);
  if (maj < 22 || (maj === 22 && min < 5)) return null;
  try {
    const { createNodeSqliteAdapter } = await import("./adapters/nodeSqliteAdapter.js");
    return await createNodeSqliteAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] node:sqlite unavailable: ${e.message}`);
    return null;
  }
}

async function trySqlJs() {
  try {
    const { createSqlJsAdapter } = await import("./adapters/sqljsAdapter.js");
    return await createSqlJsAdapter(DATA_FILE);
  } catch (e) {
    console.warn(`[DB] sql.js unavailable: ${e.message}`);
    return null;
  }
}

async function initAdapter() {
  ensureDirs();

  let adapter;
  const useRemoteDb = HAS_DATABASE_URL || REQUESTED_DB_DRIVER === "cockroach" || REQUESTED_DB_DRIVER === "cockroachdb" || REQUESTED_DB_DRIVER === "postgres" || REQUESTED_DB_DRIVER === "postgresql";

  if (useRemoteDb) {
    const { createPostgresAdapter } = await import("./adapters/postgresAdapter.js");
    adapter = await createPostgresAdapter();
  } else {
    // Default order avoids optional native better-sqlite3 downloads in CLI installs:
    //   Bun:  bun:sqlite → sql.js
    //   Node: node:sqlite (≥22.5) → sql.js → better-sqlite3 (opt-in)
    adapter = await tryBunSqlite();
    if (!adapter) adapter = await tryNodeSqlite();
    if (!adapter) adapter = await trySqlJs();
    if (!adapter && PREFER_NATIVE_SQLITE) adapter = await tryBetterSqlite();
    if (!adapter) throw new Error("[DB] No database driver available (bun/node/sql.js/better-sqlite3 all failed)");
  }

  if (!state.logged) {
    const target = useRemoteDb ? "remote" : DATA_FILE;
    console.log(`[DB] Driver: ${adapter.driver} | target: ${target}`);
    state.logged = true;
  }

  const { runMigrationOnce } = await import("./migrate.js");
  await runMigrationOnce(adapter);
  return adapter;
}

export async function getAdapter() {
  if (state.instance) return state.instance;
  if (!state.initPromise) state.initPromise = initAdapter().then((a) => { state.instance = a; return a; });
  return state.initPromise;
}

export function getAdapterSync() {
  if (!state.instance) throw new Error("[DB] adapter not initialized — await getAdapter() first");
  return state.instance;
}
