/**
 * Compression Analytics Tab
 *
 * Shows compression request stats from call_logs (request_type = 'compression'),
 * mode breakdown, provider breakdown, and cost/token savings summary.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSafeTranslations } from "@/shared/hooks/useSafeTranslations";

interface CompressionAnalyticsSummary {
  totalRequests: number;
  totalTokensSaved: number;
  avgSavingsPct: number;
  avgDurationMs: number;
  byMode: Record<string, { count: number; tokensSaved: number; avgSavingsPct: number }>;
  byProvider: Record<string, { count: number; tokensSaved: number }>;
  last24h: Array<{ hour: string; count: number; tokensSaved: number }>;
  validationFallbacks: number;
  realUsage: {
    requestsWithReceipts: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    estimatedUsdSaved: number;
    bySource: Record<string, number>;
  };
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return <div className="card p-4 flex flex-col gap-1"><div className="flex items-center gap-2 text-text-muted text-sm"><span className="material-symbols-outlined text-[18px]">{icon}</span>{label}</div><div className="text-2xl font-bold text-text">{value}</div>{sub && <div className="text-xs text-text-muted">{sub}</div>}</div>;
}

function ModeBar({ mode, count, total, tokensSaved }: { mode: string; count: number; total: number; tokensSaved: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return <div className="flex flex-col gap-1"><div className="flex justify-between text-sm"><span className="font-medium text-text capitalize">{mode}</span><span className="text-text-muted">{count} requests · {tokensSaved.toLocaleString()} tokens saved</span></div><div className="h-2 rounded-full bg-bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div><div className="text-xs text-text-muted text-right">{pct}%</div></div>;
}

function ProviderBar({ provider, count, total, tokensSaved }: { provider: string; count: number; total: number; tokensSaved: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return <div className="flex flex-col gap-1"><div className="flex justify-between text-sm"><span className="font-medium text-text">{provider}</span><span className="text-text-muted">{count} requests · {tokensSaved.toLocaleString()} tokens saved</span></div><div className="h-2 rounded-full bg-bg-muted overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} /></div><div className="text-xs text-text-muted text-right">{pct}%</div></div>;
}

const emptyStats = (): CompressionAnalyticsSummary => ({ totalRequests: 0, totalTokensSaved: 0, avgSavingsPct: 0, avgDurationMs: 0, byMode: {}, byProvider: {}, last24h: [], validationFallbacks: 0, realUsage: { requestsWithReceipts: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, estimatedUsdSaved: 0, bySource: {} } });

export default function CompressionAnalyticsTab() {
  const t = useSafeTranslations("analytics");
  const [stats, setStats] = useState<CompressionAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState<"24h" | "7d" | "30d" | "all">("24h");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/compression?since=${since}`)
      .then((r) => r.json())
      .then((d) => { setStats({ ...emptyStats(), ...d, byMode: d?.byMode ?? {}, byProvider: d?.byProvider ?? {}, last24h: d?.last24h ?? [], realUsage: { ...emptyStats().realUsage, ...(d?.realUsage ?? {}), bySource: d?.realUsage?.bySource ?? {} } }); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, [since]);

  const modes = useMemo(() => Object.entries(stats?.byMode ?? {}).sort(([, a], [, b]) => b.count - a.count), [stats]);
  const providers = useMemo(() => Object.entries(stats?.byProvider ?? {}).sort(([, a], [, b]) => b.count - a.count), [stats]);

  if (loading) return <div className="flex items-center justify-center py-16 text-text-muted"><span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>Loading compression analytics…</div>;
  if (error || !stats) return <div className="card p-6 text-center text-text-muted"><span className="material-symbols-outlined text-[32px] mb-2 block">compress</span>{error || "No compression data yet."}<p className="text-xs mt-2">Compression requests will appear here after the first request via /v1/chat/completions with compression enabled.</p></div>;

  const maxTokensPerHour = Math.max(...stats.last24h.map((h) => h.tokensSaved), 1);
  const maxCountPerHour = Math.max(...stats.last24h.map((h) => h.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2">{(["24h", "7d", "30d", "all"] as const).map((range) => (<button key={range} onClick={() => setSince(range)} className={`px-3 py-1 rounded text-sm transition-colors ${since === range ? "bg-primary text-primary-foreground" : "bg-bg-muted text-text-muted hover:bg-bg-muted/80"}`}>{range === "24h" ? "Last 24h" : range === "7d" ? "Last 7d" : range === "30d" ? "Last 30d" : "All time"}</button>))}</div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard icon="compress" label={t("compressionAnalyticsTotalRequests")} value={stats.totalRequests.toLocaleString()} />
        <StatCard icon="token" label={t("compressionAnalyticsTokensSaved")} value={stats.totalTokensSaved.toLocaleString()} />
        <StatCard icon="percent" label={t("compressionAnalyticsAvgSavings")} value={`${stats.avgSavingsPct}%`} />
        <StatCard icon="timer" label={t("compressionAnalyticsAvgDuration")} value={`${stats.avgDurationMs}ms`} />
        <StatCard icon="receipt_long" label={t("compressionAnalyticsReceipts")} value={stats.realUsage.requestsWithReceipts.toLocaleString()} sub={`${stats.realUsage.totalTokens.toLocaleString()} real tokens`} />
        <StatCard icon="verified" label={t("compressionAnalyticsFallbacks")} value={stats.validationFallbacks.toLocaleString()} sub="validation restores" />
      </div>

      {stats.realUsage.requestsWithReceipts > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-text mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">receipt_long</span>Real Usage Receipts</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
            <div><div className="text-text-muted">{t("compressionAnalyticsPromptTokens")}</div><div className="text-lg font-semibold text-text">{stats.realUsage.promptTokens.toLocaleString()}</div></div>
            <div><div className="text-text-muted">{t("compressionAnalyticsCompletionTokens")}</div><div className="text-lg font-semibold text-text">{stats.realUsage.completionTokens.toLocaleString()}</div></div>
            <div><div className="text-text-muted">{t("compressionAnalyticsTotalTokens")}</div><div className="text-lg font-semibold text-text">{stats.realUsage.totalTokens.toLocaleString()}</div></div>
            <div><div className="text-text-muted">{t("compressionAnalyticsCacheTokens")}</div><div className="text-lg font-semibold text-text">{(stats.realUsage.cacheReadTokens + stats.realUsage.cacheWriteTokens).toLocaleString()}</div></div>
            <div><div className="text-text-muted">Sources</div><div className="text-lg font-semibold text-text">{Object.entries(stats.realUsage.bySource).map(([source, count]) => `${source}: ${count}`).join(", ") || "-"}</div></div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="text-text-muted">Total Requests</div><div className="text-lg font-semibold text-text">{stats.realUsage.requestsWithReceipts.toLocaleString()}</div></div>
            <div><div className="text-text-muted">Total Input Tokens</div><div className="text-lg font-semibold text-text">{stats.realUsage.promptTokens.toLocaleString()}</div></div>
            <div><div className="text-text-muted">Output Tokens</div><div className="text-lg font-semibold text-text">{stats.realUsage.completionTokens.toLocaleString()}</div></div>
            <div><div className="text-text-muted">USD Saved</div><div className="text-lg font-semibold text-text">${stats.realUsage.estimatedUsdSaved.toFixed(4)}</div></div>
          </div>
        </div>
      )}

      {modes.length > 0 && <div className="card p-5"><h3 className="font-semibold text-text mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">tune</span>Mode Breakdown</h3><div className="flex flex-col gap-4">{modes.map(([mode, data]) => <ModeBar key={mode} mode={mode} count={data.count} total={stats.totalRequests} tokensSaved={data.tokensSaved} />)}</div></div>}
      {providers.length > 0 && <div className="card p-5"><h3 className="font-semibold text-text mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">hub</span>Provider Breakdown</h3><div className="flex flex-col gap-4">{providers.map(([prov, data]) => <ProviderBar key={prov} provider={prov} count={data.count} total={stats.totalRequests} tokensSaved={data.tokensSaved} />)}</div></div>}

      {stats.last24h.length > 0 && <div className="card p-5"><h3 className="font-semibold text-text mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary text-[20px]">show_chart</span>Last 24 Hours (Activity)</h3><div className="flex items-end gap-2 h-48">{stats.last24h.map((entry) => { const countH = (entry.count / maxCountPerHour) * 100; const tokenH = (entry.tokensSaved / maxTokensPerHour) * 100; return <div key={entry.hour} className="flex-1 flex flex-col items-center gap-2"><div className="w-full flex flex-col justify-end h-36 gap-1"><div className="w-full rounded-t bg-primary/70" style={{ height: `${Math.max(countH, 4)}%` }} title={`${entry.count} requests`} /><div className="w-full rounded-t bg-primary" style={{ height: `${Math.max(tokenH, 4)}%` }} title={`${entry.tokensSaved} tokens saved`} /></div><div className="text-[10px] text-text-muted -rotate-45 origin-top-left w-10 text-center">{entry.hour}</div></div>; })}</div></div>}
    </div>
  );
}
