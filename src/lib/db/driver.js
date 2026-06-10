import { ensureDirs } from "./paths.js";

// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._dbAdapter;
const REQUESTED_DB_DRIVER = (process.env.DB_DRIVER || process.env.DATABASE_DRIVER || "").toLowerCase();
const HAS_DATABASE_URL = !!process.env.DATABASE_URL;
const REMOTE_DB_DRIVERS = new Set(["cockroach", "cockroachdb", "postgres", "postgresql"]);
const FORCE_REMOTE_DB = process.env.FORCE_REMOTE_DB === "1";

async function initAdapter() {
  ensureDirs();

  const useRemoteDb = HAS_DATABASE_URL || REMOTE_DB_DRIVERS.has(REQUESTED_DB_DRIVER);
  if (!useRemoteDb || FORCE_REMOTE_DB) {
    if (!useRemoteDb) {
      throw new Error("[DB] Remote DB required. Set DATABASE_URL or DB_DRIVER=postgres|cockroach.");
    }
    const { createPostgresAdapter } = await import("./adapters/postgresAdapter.js");
    const adapter = await createPostgresAdapter();

    if (!state.logged) {
      console.log(`[DB] Driver: ${adapter.driver} | target: remote`);
      state.logged = true;
    }

    const { runMigrationOnce } = await import("./migrate.js");
    await runMigrationOnce(adapter);
    return adapter;
  }

  throw new Error("[DB] Remote DB required. Set DATABASE_URL or DB_DRIVER=postgres|cockroach.");
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
