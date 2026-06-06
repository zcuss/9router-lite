import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/db/driver";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export async function GET() {
  let dbStatus = "ok";
  try {
    const db = await getAdapter();
    await db.get("SELECT 1");
  } catch (e) {
    dbStatus = "error";
  }

  return NextResponse.json({ 
    ok: true,
    db: dbStatus,
    timestamp: new Date().toISOString()
  }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
