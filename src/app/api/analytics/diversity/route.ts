import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    score: 0,
    providerCount: 0,
    modelCount: 0,
    distribution: [],
    warnings: [],
  });
}
