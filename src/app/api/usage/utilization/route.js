import { NextResponse } from "next/server";
import { getUsageHistory } from "@/lib/usageDb";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "24h";
    const aggregateBy = searchParams.get("aggregateBy") || "provider";

    const rawData = await getUsageHistory({
      startDate: new Date(Date.now() - 30 * 24 * 3600000).toISOString(),
    });

    const now = Date.now();
    let cutoffMs = 24 * 3600000;
    if (range === "1h") cutoffMs = 3600000;
    else if (range === "6h") cutoffMs = 6 * 3600000;
    else if (range === "7d") cutoffMs = 7 * 24 * 3600000;
    else if (range === "30d") cutoffMs = 30 * 24 * 3600000;

    const filtered = rawData.filter(
      (r) => r.timestamp && now - new Date(r.timestamp).getTime() <= cutoffMs
    );

    const providerSet = new Set();
    const utilizationPoints = [];
    const groups = new Map();

    for (const r of filtered) {
      if (!r.timestamp || !r.provider) continue;
      const key = r.provider;
      providerSet.add(key);

      const date = new Date(r.timestamp);
      date.setMinutes(0, 0, 0);
      const roundedTs = date.toISOString();

      if (!groups.has(roundedTs)) {
        groups.set(roundedTs, new Map());
      }
      const timeGroup = groups.get(roundedTs);
      if (!timeGroup.has(key)) {
        timeGroup.set(key, { total: 0, success: 0 });
      }
      const stats = timeGroup.get(key);
      stats.total += 1;
      if (r.status === "ok") stats.success += 1;
    }

    for (const [ts, timeGroup] of groups.entries()) {
      for (const [key, stats] of timeGroup.entries()) {
        utilizationPoints.push({
          timestamp: ts,
          provider: key,
          remainingPct: stats.total > 0 ? (stats.success / stats.total) * 100 : 100,
          usedPct: stats.total > 0 ? ((stats.total - stats.success) / stats.total) * 100 : 0,
        });
      }
    }

    const providers = Array.from(providerSet);

    return NextResponse.json({
      data: utilizationPoints,
      providers: providers.length > 0 ? providers : [],
      timeRange: range,
      aggregateBy,
    });
  } catch (error) {
    console.error("[API] Utilization error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
