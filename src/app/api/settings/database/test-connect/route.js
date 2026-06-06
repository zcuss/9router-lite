import { NextResponse } from "next/server";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function encodeDatabaseUrlPassword(urlStr) {
  if (!urlStr) return urlStr;
  try {
    const parsed = new URL(urlStr);
    if (parsed.password) {
      parsed.password = encodeURIComponent(decodeURIComponent(parsed.password));
    }
    return parsed.toString();
  } catch (e) {
    const match = urlStr.match(/^(postgresql:\/\/|postgres:\/\/)([^:]+):(.*)@([^/]+)(.*)$/);
    if (match) {
      const [_, protocol, user, password, hostAndPort, rest] = match;
      const encodedPassword = encodeURIComponent(decodeURIComponent(password));
      return `${protocol}${user}:${encodedPassword}@${hostAndPort}${rest}`;
    }
    return urlStr;
  }
}

export async function POST(request) {
  try {
    const { DATABASE_URL, DB_DRIVER } = await request.json();

    if (DB_DRIVER === "local") {
      return NextResponse.json({ success: true });
    }

    let Database;
    switch (DB_DRIVER) {
      case "postgres":
      case "cockroach":
        Database = require("pg").Client;
        break;
      default:
        return NextResponse.json({ error: "Driver database tidak didukung" }, { status: 400 });
    }

    if (!DATABASE_URL) {
      return NextResponse.json({ error: "URL database tidak boleh kosong" }, { status: 400 });
    }

    const finalUrl = encodeDatabaseUrlPassword(DATABASE_URL);
    const client = new Database({ connectionString: finalUrl });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({ error: "Koneksi gagal: " + error.message }, { status: 500 });
  }
}
