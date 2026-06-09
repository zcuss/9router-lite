/**
 * Tujuan: Endpoint untuk mengambil data utilisasi provider/koneksi.
 * Caller: ProviderUtilizationTab.tsx (Dashboard Analytics)
 * Dependensi: usageRepo (mocked sementara)
 * Main Functions: GET
 * Side Effects: None
 */
import { NextResponse } from "next/server";
import { getUsageHistory } from "@/lib/db/repos/usageRepo";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";
    const aggregateBy = searchParams.get("aggregateBy") || "provider";

    // Mock data for now to satisfy the UI while PRD v2 is being finalized
    // In a real scenario, this would query usageHistory with proper grouping
    const now = new Date();
    const data = [];
    const providers = ["openai", "anthropic", "gemini", "groq"];

    // Generate some dummy points for the last 24 hours
    for (let i = 0; i < 24; i++) {
      const ts = new Date(now.getTime() - (23 - i) * 3600000).toISOString();
      for (const p of providers) {
        data.push({
          timestamp: ts,
          provider: p,
          remainingPct: 70 + Math.random() * 30,
          usedPct: Math.random() * 20
        });
      }
    }

    return NextResponse.json({
      data,
      providers,
      timeRange: range,
      aggregateBy
    });
  } catch (error) {
    console.error("[API] Utilization error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
