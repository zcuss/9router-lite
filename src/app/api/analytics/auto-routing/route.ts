import { NextResponse } from "next/server";
import { getDbInstance } from "@/lib/db/core";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/auto-routing
 * Returns auto-routing usage statistics and metrics.
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const db = getDbInstance();
    const totalRequests = db.prepare(`SELECT COUNT(*) as count FROM usage_logs WHERE model = 'auto' OR model LIKE 'auto/%'`).get() as { count: number };
    const variantRows = db.prepare(`
      SELECT
        CASE
          WHEN model = 'auto' THEN 'default'
          WHEN model LIKE 'auto/%' THEN SUBSTR(model, 6)
          ELSE 'other'
        END as variant,
        COUNT(*) as count
      FROM usage_logs
      WHERE model = 'auto' OR model LIKE 'auto/%'
      GROUP BY variant
      ORDER BY count DESC
    `).all() as Array<{ variant: string; count: number }>;
    const variantBreakdown: Record<string, number> = {};
    variantRows.forEach((row) => { variantBreakdown[row.variant] = row.count; });

    const topProviders = db.prepare(`
      SELECT provider, COUNT(*) as count
      FROM usage_logs
      WHERE model = 'auto' OR model LIKE 'auto/%'
      GROUP BY provider
      ORDER BY count DESC
      LIMIT 10
    `).all() as Array<{ provider: string; count: number }>;

    const perApiKeyRows = db.prepare(`
      SELECT
        COALESCE(NULLIF(api_key_label, ''), CASE WHEN api_key IS NOT NULL AND api_key != '' THEN SUBSTR(api_key, 1, 12) || '…' ELSE 'unknown' END) as apiKeyLabel,
        COUNT(*) as totalRequests,
        COALESCE(SUM(prompt_tokens), 0) as totalInputTokens,
        COALESCE(SUM(completion_tokens), 0) as totalOutputTokens,
        COALESCE(MIN(requests_per_minute), 0) as minRequestsPerMin,
        COALESCE(MAX(requests_per_minute), 0) as maxRequestsPerMin,
        COALESCE(ROUND(AVG(requests_per_minute), 2), 0) as avgRequestsPerMin
      FROM (
        SELECT
          ul.*,
          COALESCE(pc.name, '') as api_key_label,
          COUNT(*) OVER (
            PARTITION BY COALESCE(ul.api_key_id, ul.api_key, ul.connection_id, ul.user_id), strftime('%Y-%m-%dT%H:%M', ul.created_at)
          ) as requests_per_minute
        FROM usage_logs ul
        LEFT JOIN providerConnections pc ON pc.id = ul.connection_id
        WHERE ul.model = 'auto' OR ul.model LIKE 'auto/%'
      ) grouped
      GROUP BY apiKeyLabel
      ORDER BY totalRequests DESC
      LIMIT 50
    `).all() as Array<{
      apiKeyLabel: string;
      totalRequests: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      minRequestsPerMin: number;
      maxRequestsPerMin: number;
      avgRequestsPerMin: number;
    }>;

    return NextResponse.json({
      totalRequests: totalRequests.count,
      variantBreakdown,
      topProviders,
      perApiKey: perApiKeyRows,
      totalsByApiKey: perApiKeyRows.map((row) => ({
        apiKeyLabel: row.apiKeyLabel,
        totalRequests: row.totalRequests,
        totalInputTokens: row.totalInputTokens,
        totalOutputTokens: row.totalOutputTokens,
        minRequestsPerMin: row.minRequestsPerMin,
        maxRequestsPerMin: row.maxRequestsPerMin,
        avgRequestsPerMin: row.avgRequestsPerMin,
      })),
    });
  } catch (error) {
    console.error("Auto-routing analytics error:", error);
    return NextResponse.json({
      totalRequests: 0,
      variantBreakdown: {},
      topProviders: [],
      perApiKey: [],
      totalsByApiKey: [],
    });
  }
}
