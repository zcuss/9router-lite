import { ensureDirs, DATA_FILE } from "./paths.js";

// Use global to survive Next.js dev hot-reload (module state resets on reload)
if (!global._dbAdapter) global._dbAdapter = { instance: null, initPromise: null, logged: false };
const state = global._dbAdapter;
const PREFER_NATIVE_SQLITE = process.env.PREFER_NATIVE_SQLITE === "1";
const REQUESTED_DB_DRIVER = (process.env.DB_DRIVER || process.env.DATABASE_DRIVER || "").toLowerCase();
const HAS_DATABASE_URL = !!process.env.DATABASE_URL;
const REMOTE_DB_DRIVERS = new Set(["cockroach", "cockroachdb", "postgres", "postgresql"]);
const FORCE_REMOTE_DB = process.env.FORCE_REMOTE_DB === "1";

async function initAdapter() {
  ensureDirs();

  let adapter;
  const useRemoteDb = HAS_DATABASE_URL || REMOTE_DB_DRIVERS.has(REQUESTED_DB_DRIVER);

  if (useRemoteDb) {
    const { createPostgresAdapter } = await import("./adapters/postgresAdapter.js");
    adapter = await createPostgresAdapter();
  } else if (!FORCE_REMOTE_DB) {
    const { createSqlJsAdapter } = await import("./adapters/sqljsAdapter.js");
    adapter = await createSqlJsAdapter(DATA_FILE);
    if (!state.logged) {
      console.warn("[DB] DATABASE_URL/DB_DRIVER missing, fallback to local sqlite for login/bootstrap only");
    }
  } else {
    throw new Error("[DB] Remote DB required. Set DATABASE_URL or DB_DRIVER=cockroach/postgres etc.");
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
