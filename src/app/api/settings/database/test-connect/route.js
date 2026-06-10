import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function encodeDatabaseUrlPassword(urlStr) {
  if (!urlStr) return urlStr;
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
    return parsed.toString();
  } catch {
    const match = urlStr.match(/^(postgresql:\/\/|postgres:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
    if (match) {
      const [_, protocol, user, password, hostAndPort, rest] = match;
      const encodedPassword = encodeURIComponent(decodeURIComponent(password));
      return `${protocol}${user}:${encodedPassword}@${hostAndPort}${rest}`;
    }
    return urlStr;
  }
}

function normalizeDriver(rawDriver) {
  const driver = (rawDriver || "").toLowerCase();
  if (["postgres", "postgresql"].includes(driver)) return "postgres";
  if (["cockroach", "cockroachdb"].includes(driver)) return "cockroach";
  return "local";
}

export async function POST(request) {
  try {
    const { DATABASE_URL, DB_DRIVER } = await request.json();
    const normalizedDriver = normalizeDriver(DB_DRIVER);

    if (normalizedDriver === "local") {
      return NextResponse.json({ success: true, DB_DRIVER: normalizedDriver });
    }

    const Database = require("pg").Client;
    if (!DATABASE_URL) {
      return NextResponse.json({ error: "URL database tidak boleh kosong" }, { status: 400 });
    }

    const finalUrl = encodeDatabaseUrlPassword(DATABASE_URL);
    const client = new Database({ connectionString: finalUrl });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();

    return NextResponse.json({ success: true, DB_DRIVER: normalizedDriver });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({ error: "Koneksi gagal: " + error.message }, { status: 500 });
  }
}
