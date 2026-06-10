"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

export default function OverviewCards({ stats }) {
  const tp10m = stats.throughput || { min: 0, max: 0, avg: 0 };
  const tp1m = stats.throughput1m || { min: 0, max: 0, avg: 0 };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-4">
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Total Requests</span>
          <span className="truncate text-2xl font-bold">{fmt(stats.totalRequests)}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Total Input Tokens</span>
          <span className="truncate text-2xl font-bold text-primary">{fmt(stats.totalPromptTokens)}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Output Tokens</span>
          <span className="truncate text-2xl font-bold text-success">{fmt(stats.totalCompletionTokens)}</span>
        </Card>
        <Card className="flex min-w-0 flex-col gap-1 px-4 py-3">
          <span className="text-text-muted text-sm uppercase font-semibold">Est. Cost</span>
          <span className="truncate text-2xl font-bold text-warning">~{fmtCost(stats.totalCost)}</span>
          <span className="text-[10px] text-text-muted">Estimated, not actual billing</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Throughput (Last 10 Minutes)</h4>
          <div className="grid grid-cols-3 gap-2">
            <Card className="flex flex-col gap-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border/40">
              <span className="text-text-muted text-[10px] uppercase font-medium">Min RPM</span>
              <span className="text-base font-bold text-text-main">{tp10m.min}</span>
            </Card>
            <Card className="flex flex-col gap-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border/40">
              <span className="text-text-muted text-[10px] uppercase font-medium">Max RPM</span>
              <span className="text-base font-bold text-text-main">{tp10m.max}</span>
            </Card>
            <Card className="flex flex-col gap-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border/40">
              <span className="text-text-muted text-[10px] uppercase font-medium">Avg RPM</span>
              <span className="text-base font-bold text-text-main">{tp10m.avg}</span>
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Throughput (Last 1 Minute)</h4>
          <div className="grid grid-cols-3 gap-2">
            <Card className="flex flex-col gap-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border/40">
              <span className="text-text-muted text-[10px] uppercase font-medium">Min RPM</span>
              <span className="text-base font-bold text-text-main">{tp1m.min}</span>
            </Card>
            <Card className="flex flex-col gap-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border/40">
              <span className="text-text-muted text-[10px] uppercase font-medium">Max RPM</span>
              <span className="text-base font-bold text-text-main">{tp1m.max}</span>
            </Card>
            <Card className="flex flex-col gap-1 px-3 py-2 bg-black/5 dark:bg-white/5 border border-border/40">
              <span className="text-text-muted text-[10px] uppercase font-medium">Avg RPM</span>
              <span className="text-base font-bold text-text-main">{tp1m.avg}</span>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
};
