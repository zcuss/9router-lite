import { NextResponse } from "next/server";

function detectDriver() {
  const rawDriver = (process.env.DB_DRIVER || process.env.DATABASE_DRIVER || "").toLowerCase();
  if (["cockroach", "cockroachdb"].includes(rawDriver)) return "cockroach";
  if (["postgres", "postgresql"].includes(rawDriver)) return "postgres";
  return "local";
}

export async function GET() {
  try {
    const DB_DRIVER = detectDriver();
    const DATABASE_URL = DB_DRIVER === "local" ? "" : (process.env.DATABASE_URL || "");

    return NextResponse.json({
      success: true,
      DB_DRIVER,
      DATABASE_URL,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Gagal membaca konfigurasi database: " + error.message },
      { status: 500 }
    );
  }
}
