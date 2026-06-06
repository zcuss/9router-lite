import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

let tempDir;
const originalDataDir = process.env.DATA_DIR;
const originalDatabaseUrl = process.env.DATABASE_URL;
const originalDbDriver = process.env.DB_DRIVER;
const originalDatabaseDriver = process.env.DATABASE_DRIVER;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "9router-remote-db-"));
  process.env.DATA_DIR = tempDir;
  delete global._dbAdapter;
  vi.resetModules();
});

afterEach(() => {
  try { global._dbAdapter?.instance?.close?.(); } catch {}
  delete global._dbAdapter;
  if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
  if (originalDbDriver === undefined) delete process.env.DB_DRIVER;
  else process.env.DB_DRIVER = originalDbDriver;
  if (originalDatabaseDriver === undefined) delete process.env.DATABASE_DRIVER;
  else process.env.DATABASE_DRIVER = originalDatabaseDriver;
});

describe("Remote DB driver", () => {
  it("uses Postgres/Cockroach adapter when DATABASE_URL is set", async () => {
    process.env.DATABASE_URL = "postgresql://demo:demo@localhost:26257/app";
    vi.doMock("pg", () => ({
      Pool: class MockPool {
        async query() { return { rows: [], rowCount: 0 }; }
        async end() {}
      },
    }));
    const { getAdapter } = await import("@/lib/db/driver.js");
    const db = await getAdapter();
    expect(db.driver).toBe("postgres");
  });

  it("requires DATABASE_URL when DB_DRIVER requests cockroach", async () => {
    process.env.DB_DRIVER = "cockroach";
    delete process.env.DATABASE_URL;
    const { getAdapter } = await import("@/lib/db/driver.js");
    await expect(getAdapter()).rejects.toThrow(/DATABASE_URL is required/i);
  });
});
