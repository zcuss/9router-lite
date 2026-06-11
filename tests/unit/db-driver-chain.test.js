import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const originalDataDir = process.env.DATA_DIR;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDbDriver = process.env.DB_DRIVER;
const originalDatabaseDriver = process.env.DATABASE_DRIVER;

beforeEach(() => {
  process.env.DATA_DIR = "/tmp/9router-test";
  delete process.env.DATABASE_URL;
  delete process.env.DB_DRIVER;
  delete process.env.DATABASE_DRIVER;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDbDriver === undefined) delete process.env.DB_DRIVER;
  else process.env.DB_DRIVER = originalDbDriver;
  if (originalDatabaseDriver === undefined) delete process.env.DATABASE_DRIVER;
  else process.env.DATABASE_DRIVER = originalDatabaseDriver;
});

describe("Remote DB driver guard", () => {
  it("throws when remote DB env missing", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    await expect(getAdapter()).rejects.toThrow(/Remote DB required/i);
  });

  it("uses postgres adapter when DATABASE_URL is present", async () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/9router";
    vi.doMock("@/lib/db/adapters/postgresAdapter.js", () => ({
      createPostgresAdapter: async () => ({
        driver: "postgres",
        async get() { return { c: 1, value: "1" }; },
        async all() { return []; },
        async run() { return { changes: 0 }; },
        async exec() {},
        async transactionAsync(fn) { return await fn(); },
        async listColumns() { return []; },
        close() {},
      }),
    }));
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    expect(db.driver).toBe("postgres");
  });
});
