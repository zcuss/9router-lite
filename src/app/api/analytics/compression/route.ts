/**
 * GET /api/analytics/compression
 *
 * Returns aggregated compression analytics from the compression_analytics table.
 * Supports ?since=24h|7d|30d|all (default: 24h).
 */

import { NextResponse } from "next/server";
import { getCompressionAnalyticsSummary } from "@/lib/db/compressionAnalytics";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";

export const dynamic = "force-dynamic";

const emptySummary = {
  totalRequests: 0,
  totalOriginalTokens: 0,
  totalSavedTokens: 0,
  averageRatio: 0,
  byStrategy: [],
  byModel: [],
};

export async function GET(req: Request) {
  const authError = await requireManagementAuth(req);
  if (authError) return authError;

  try {
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since") ?? "24h";
    const validSince = ["24h", "7d", "30d", "all"].includes(sinceParam) ? sinceParam : "24h";

    const summary = await getCompressionAnalyticsSummary(validSince === "all" ? undefined : validSince);
    const normalized = {
      ...emptySummary,
      ...(summary ?? {}),
      byStrategy: (summary as { byStrategy?: unknown[] } | undefined)?.byStrategy ?? [],
      byModel: (summary as { byModel?: unknown[] } | undefined)?.byModel ?? [],
      byMode: (summary as { byMode?: Record<string, unknown> } | undefined)?.byMode ?? {},
      byProvider: (summary as { byProvider?: Record<string, unknown> } | undefined)?.byProvider ?? {},
      last24h: (summary as { last24h?: Array<unknown> } | undefined)?.last24h ?? [],
      validationFallbacks: (summary as { validationFallbacks?: number } | undefined)?.validationFallbacks ?? 0,
      avgDurationMs: (summary as { avgDurationMs?: number } | undefined)?.avgDurationMs ?? 0,
      avgSavingsPct: (summary as { avgSavingsPct?: number } | undefined)?.avgSavingsPct ?? 0,
      totalTokensSaved: (summary as { totalTokensSaved?: number } | undefined)?.totalTokensSaved ?? 0,
      realUsage: {
        requestsWithReceipts: (summary as { realUsage?: { requestsWithReceipts?: number } } | undefined)?.realUsage?.requestsWithReceipts ?? 0,
        promptTokens: (summary as { realUsage?: { promptTokens?: number } } | undefined)?.realUsage?.promptTokens ?? 0,
        completionTokens: (summary as { realUsage?: { completionTokens?: number } } | undefined)?.realUsage?.completionTokens ?? 0,
        totalTokens: (summary as { realUsage?: { totalTokens?: number } } | undefined)?.realUsage?.totalTokens ?? 0,
        cacheReadTokens: (summary as { realUsage?: { cacheReadTokens?: number } } | undefined)?.realUsage?.cacheReadTokens ?? 0,
        cacheWriteTokens: (summary as { realUsage?: { cacheWriteTokens?: number } } | undefined)?.realUsage?.cacheWriteTokens ?? 0,
        estimatedUsdSaved: (summary as { realUsage?: { estimatedUsdSaved?: number } } | undefined)?.realUsage?.estimatedUsdSaved ?? 0,
        bySource: (summary as { realUsage?: { bySource?: Record<string, number> } } | undefined)?.realUsage?.bySource ?? {},
      },
    };

    return NextResponse.json(normalized);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/analytics/compression]", msg);
    return NextResponse.json(emptySummary, { status: 200 });
  }
}
