// Verify default driver order prefers built-in/fallback drivers over optional better-sqlite3.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;
const originalPreferNativeSqlite = process.env.PREFER_NATIVE_SQLITE;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDbDriver = process.env.DB_DRIVER;
const originalDatabaseDriver = process.env.DATABASE_DRIVER;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-chain-"));
  process.env.DATA_DIR = tempDir;
  delete process.env.PREFER_NATIVE_SQLITE;
  delete process.env.DATABASE_URL;
  delete process.env.DB_DRIVER;
  delete process.env.DATABASE_DRIVER;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalPreferNativeSqlite === undefined) delete process.env.PREFER_NATIVE_SQLITE;
  else process.env.PREFER_NATIVE_SQLITE = originalPreferNativeSqlite;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDbDriver === undefined) delete process.env.DB_DRIVER;
  else process.env.DB_DRIVER = originalDbDriver;
  if (originalDatabaseDriver === undefined) delete process.env.DATABASE_DRIVER;
  else process.env.DATABASE_DRIVER = originalDatabaseDriver;
});

describe("Driver fallback chain", () => {
  it("default → prefers built-in sqlite or sql.js", async () => {
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    const [maj, min] = process.versions.node.split(".").map(Number);
    if (process.versions.bun) {
      expect(["bun:sqlite", "sql.js"]).toContain(db.driver);
    } else if (maj > 22 || (maj === 22 && min >= 5)) {
      expect(db.driver).toBe("node:sqlite");
    } else {
      expect(db.driver).toBe("sql.js");
    }
  });

  it("falls back to sql.js when built-in sqlite unavailable", async () => {
    vi.doMock("@/lib/db/adapters/nodeSqliteAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    expect(db.driver).toBe("sql.js");
  });

  it("does not load better-sqlite3 unless explicitly enabled", async () => {
    vi.doMock("@/lib/db/adapters/nodeSqliteAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    vi.doMock("@/lib/db/adapters/sqljsAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    vi.doMock("@/lib/db/adapters/betterSqliteAdapter.js", () => {
      throw new Error("better-sqlite3 should not be loaded by default");
    });
    const { getAdapter } = await import("@/lib/db/driver.js");
    await expect(getAdapter()).rejects.toThrow(/No database driver available/i);
  });

  it("uses better-sqlite3 only when explicitly enabled", async () => {
    process.env.PREFER_NATIVE_SQLITE = "1";
    vi.doMock("@/lib/db/adapters/nodeSqliteAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    vi.doMock("@/lib/db/adapters/sqljsAdapter.js", () => {
      throw new Error("simulated unavailable");
    });
    vi.doMock("@/lib/db/adapters/betterSqliteAdapter.js", () => ({
      createBetterSqliteAdapter: () => ({
        driver: "better-sqlite3",
        async get() { return { c: 1, value: "1" }; },
        async all() { return []; },
        async run() { return { changes: 0 }; },
        async exec() {},
        async transactionAsync(fn) { return await fn(); },
        close() {},
      }),
    }));
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    expect(db.driver).toBe("better-sqlite3");
  });
});
