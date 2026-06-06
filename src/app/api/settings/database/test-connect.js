import { NextResponse } from "next/server";
import { createRequire } from "node:module";
import { getSettings } from "@/lib/localDb";

const require = createRequire(import.meta.url);

export async function POST(request) {
  try {
    const { DATABASE_URL, DB_DRIVER } = await request.json();
    let Database;

    switch (DB_DRIVER) {
      case "postgres":
        Database = require("pg").Client;
        break;
      case "cockroach":
        Database = require("pg").Client;
        break;
      default:
        return NextResponse.json({ error: "Unsupported DB_DRIVER" }, { status: 400 });
    }

    const client = new Database({ connectionString: DATABASE_URL });
    await client.connect();
    await client.query("SELECT 1");
    await client.end();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({ error: "Connection failed" }, { status: 500 });
  }
}