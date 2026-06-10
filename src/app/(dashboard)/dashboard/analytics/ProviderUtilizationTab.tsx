"use client";

import { useSafeTranslations } from "@/shared/hooks/useSafeTranslations";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Card from "@/shared/components/Card";
import ProviderIcon from "@/shared/components/ProviderIcon";
import TimeRangeSelector from "@/shared/components/analytics/TimeRangeSelector";
import type {
  ProviderUtilizationPoint,
  ProviderUtilizationResponse,
  UtilizationTimeRange,
} from "@/shared/types/utilization";

const RANGE_LABELS: Record<UtilizationTimeRange, string> = {
  "1h": "Last hour",
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const PROVIDER_COLORS = [
  "var(--color-primary)",
  "var(--color-accent)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-error)",
  "var(--color-text-muted)",
];

function formatTimestamp(value: string, range: UtilizationTimeRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (range === "1h" || range === "24h") {
    return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
}

function formatTooltipTimestamp(value: string, range: UtilizationTimeRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: range === "1h" || range === "24h" ? "2-digit" : undefined,
    minute: range === "1h" || range === "24h" ? "2-digit" : undefined,
  }).format(date);
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getLatestPoints(points: ProviderUtilizationPoint[]) {
  const latestByProvider = new Map<string, ProviderUtilizationPoint>();
  for (const point of points) {
    const current = latestByProvider.get(point.provider);
    if (!current || new Date(point.timestamp).getTime() > new Date(current.timestamp).getTime()) {
      latestByProvider.set(point.provider, point);
    }
  }
  return Array.from(latestByProvider.values()).sort((a, b) => b.remainingPct - a.remainingPct);
}

function ChartFallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed border-border/50 bg-black/[0.02] text-center text-sm text-text-muted dark:bg-white/[0.02]">
      <div className="max-w-md px-6 py-10">
        <span className="material-symbols-outlined mb-3 block text-[32px] text-text-muted/70">
          timeline
        </span>
        <p>{message}</p>
      </div>
    </div>
  );
}


const LABELS = {
  providerUtilizationTitle: "Provider Utilization",
  providerUtilizationLatestSnapshot: "Latest Snapshot",
  providerUtilizationRemainingCapacity: "Remaining Capacity",
  providerUtilizationNoData: "No utilization data yet.",
  providerUtilizationFailedToLoad: "Failed to load provider utilization.",
  providerUtilizationGettingStarted: "Getting started",
  providerUtilizationRemaining: "Remaining",
};

function safeLabel(t: (key: string) => string, key: keyof typeof LABELS) {
  const value = t(key);
  return value === key ? LABELS[key] : value;
}

export default function ProviderUtilizationTab() {
  const t = useSafeTranslations("analytics");
  const [range, setRange] = useState<UtilizationTimeRange>("24h");
  const [aggregateBy, setAggregateBy] = useState<"provider" | "connection">("provider");
  const [data, setData] = useState<ProviderUtilizationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const fetchUtilization = useCallback(async (selectedRange: UtilizationTimeRange, selectedAggregate: "provider" | "connection", signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/usage/utilization?range=${selectedRange}&aggregateBy=${selectedAggregate}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch utilization data");
      setData((await response.json()) as ProviderUtilizationResponse);
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch utilization data");
      setData(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchUtilization(range, aggregateBy, controller.signal);
    return () => controller.abort();
  }, [fetchUtilization, range, aggregateBy]);

  const providerColors = useMemo(() => {
    const colors = new Map<string, string>();
    for (const [index, provider] of (data?.providers ?? []).entries()) colors.set(provider, PROVIDER_COLORS[index % PROVIDER_COLORS.length]);
    return colors;
  }, [data?.providers]);

  const chartData = useMemo(() => {
    if (!data?.data.length) return [];
    const byTimestamp = new Map<string, Record<string, number | string>>();
    for (const point of data.data) {
      const entry = byTimestamp.get(point.timestamp) ?? { timestamp: point.timestamp, label: formatTimestamp(point.timestamp, data.timeRange) };
      entry[point.provider] = Number(point.remainingPct.toFixed(2));
      byTimestamp.set(point.timestamp, entry);
    }
    return Array.from(byTimestamp.entries())
      .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
      .map(([, value]) => value);
  }, [data]);

  const latestPoints = useMemo(() => getLatestPoints(data?.data ?? []), [data?.data]);
  const hasData = Boolean(data?.data.length);
  const canRenderChart = hasData && chartData.length > 0 && (data?.providers?.length ?? 0) > 0;

  const handleRetry = useCallback(() => {
    setRetrying(true);
    setError(null);
    fetchUtilization(range, aggregateBy).finally(() => setRetrying(false));
  }, [range, aggregateBy, fetchUtilization]);

  return (
    <div className="flex flex-col gap-6">
      <Card title={safeLabel(t, "providerUtilizationTitle")} subtitle={RANGE_LABELS[range]} icon="monitoring" action={<div className="flex items-center gap-4"><div className="flex rounded-lg border border-border/50 bg-black/5 p-1 dark:bg-white/5"><button onClick={() => setAggregateBy("provider")} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${aggregateBy === "provider" ? "bg-surface text-text-main shadow-sm" : "text-text-muted hover:text-text-main"}`}><span className="material-symbols-outlined text-[14px]">dns</span>Global View</button><button onClick={() => setAggregateBy("connection")} className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${aggregateBy === "connection" ? "bg-surface text-text-main shadow-sm" : "text-text-muted hover:text-text-main"}`}><span className="material-symbols-outlined text-[14px]">account_tree</span>Account Split</button></div><TimeRangeSelector value={range} onChange={setRange} /></div>} className="overflow-hidden">
        {loading && !hasData ? (
          <div className="flex min-h-80 items-center justify-center text-sm text-text-muted"><span className="material-symbols-outlined mr-2 animate-spin text-[18px]">progress_activity</span>Loading utilization data…</div>
        ) : error ? (
          <div className="flex min-h-80 flex-col items-center justify-center gap-4 text-center">
            <span className="material-symbols-outlined text-[32px] text-error">error</span>
            <div className="flex flex-col gap-1"><p className="text-sm font-medium text-text-main">{safeLabel(t, "providerUtilizationFailedToLoad")}</p><p className="text-sm text-text-muted">{error}</p></div>
            <button type="button" onClick={handleRetry} disabled={retrying} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed">{retrying ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>Retrying…</> : <><span className="material-symbols-outlined text-[18px]">refresh</span>Retry</>}</button>
          </div>
        ) : !canRenderChart ? (
          <ChartFallback message={safeLabel(t, "providerUtilizationNoData") || "Provider quota snapshots will appear here after utilization data is collected."} />
        ) : (
          <div className="flex flex-col gap-5">
            <div className="h-80 min-h-80 w-full min-w-0 rounded-xl border border-black/5 bg-black/[0.02] px-3 py-4 dark:border-white/5 dark:bg-white/[0.02]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}><CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="timestamp" tickFormatter={(value) => formatTimestamp(String(value), range)} tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--color-border)" }} tickLine={{ stroke: "var(--color-border)" }} minTickGap={24} /><YAxis domain={[0, 100]} tickFormatter={formatPercent} tick={{ fill: "var(--color-text-muted)", fontSize: 12 }} axisLine={{ stroke: "var(--color-border)" }} tickLine={{ stroke: "var(--color-border)" }} width={44} /><Tooltip labelFormatter={(value) => formatTooltipTimestamp(String(value), range)} formatter={(value: number, name: string) => [formatPercent(value), name]} contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: 12, color: "var(--color-text-main)", boxShadow: "var(--shadow-soft)" }} itemStyle={{ color: "var(--color-text-main)" }} labelStyle={{ color: "var(--color-text-main)", fontWeight: 600 }} /><Legend />{data?.providers.map((provider) => (<Line key={provider} type="monotone" dataKey={provider} name={provider} stroke={providerColors.get(provider) ?? "var(--color-primary)"} strokeWidth={2.5} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} connectNulls />))}</LineChart></ResponsiveContainer></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{latestPoints.map((point) => { const isLow = point.remainingPct <= 20; return (<Card.Section key={point.provider} className="flex h-full flex-col gap-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/5 bg-surface text-text-main dark:border-white/5"><ProviderIcon providerId={point.provider} size={22} fallbackText={point.provider.slice(0, 2).toUpperCase()} /></div><div><p className="text-sm font-semibold text-text-main">{point.provider}</p><p className="text-xs text-text-muted">{point.provider}</p></div></div><span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${point.isExhausted ? "bg-error/10 text-error" : isLow ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{point.isExhausted ? "Exhausted" : isLow ? "Low" : "Healthy"}</span></div><div className="flex items-end justify-between gap-3"><div><p className="text-3xl font-bold text-text-main">{point.remainingPct.toFixed(point.remainingPct < 10 ? 1 : 0)}%</p><p className="mt-1 text-xs text-text-muted">{Math.abs(point.remainingPct).toFixed(0)}% remaining</p></div><div className="text-right text-xs text-text-muted"><p>{formatTooltipTimestamp(point.timestamp, range)}</p><p className="mt-1 uppercase tracking-[0.14em]">{point.windowKey}</p></div></div><div className="flex flex-col gap-2"><div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/5"><div className={`h-full rounded-full transition-all ${point.isExhausted ? "bg-error" : isLow ? "bg-warning" : "bg-primary"}`} style={{ width: `${Math.max(point.remainingPct, 0)}%` }} /></div><div className="flex items-center justify-between text-xs text-text-muted"><span>0%</span><span>Remaining quota</span><span>100%</span></div></div></Card.Section>); })}</div>
          </div>
        )}
      </Card>
    </div>
  );
}
