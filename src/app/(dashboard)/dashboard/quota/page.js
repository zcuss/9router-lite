"use client";

import { useEffect, useMemo, useState } from "react";

function fmt(n) {
  return new Intl.NumberFormat().format(Math.round(Number(n || 0)));
}
function money(n) {
  return `$${Number(n || 0).toFixed(4)}`;
}
function inRange(ts, ms) {
  return Date.now() - new Date(ts).getTime() <= ms;
}
function todayKey(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function monthKey(ts) {
  const d = ts ? new Date(ts) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function sumRows(rows, predicate) {
  return rows.filter(predicate).reduce((acc, r) => {
    acc.requests += 1;
    acc.promptTokens += r.tokens?.prompt_tokens || r.tokens?.input_tokens || r.promptTokens || 0;
    acc.completionTokens += r.tokens?.completion_tokens || r.tokens?.output_tokens || r.completionTokens || 0;
    acc.cost += Number(r.cost || 0);
    return acc;
  }, { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 });
}

function MetricBlock({ title, data }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-black/20 p-3 min-w-[140px]">
      <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted/60 mb-2">{title}</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div><div className="text-text-muted">Req</div><div className="font-mono text-text-main">{fmt(data.requests)}</div></div>
        <div><div className="text-text-muted">Tok</div><div className="font-mono text-text-main">{fmt(data.promptTokens + data.completionTokens)}</div></div>
        <div><div className="text-text-muted">Cost</div><div className="font-mono text-brand-500">{money(data.cost)}</div></div>
      </div>
    </div>
  );
}

export default function QuotaPage() {
  const [stats, setStats] = useState(null);
  const [keys, setKeys] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/usage/stats?period=30d").then((r) => r.json()),
      fetch("/api/keys").then((r) => r.json()).catch(() => ({ keys: [] })),
      fetch("/api/usage/history?period=30d").then((r) => r.json()).catch(() => ({ history: [] })),
    ]).then(([s, k, h]) => {
      setStats(s || {});
      setKeys(k.keys || k.apiKeys || []);
      setHistory(h.history || h.items || []);
    }).catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => {
    const sourceKeys = keys.length ? keys : Object.entries(stats?.byApiKey || {}).map(([key, v]) => ({ key, name: v.name || key }));
    return sourceKeys.map((key) => {
      const keyVal = key.key || key.token || key.id;
      const related = history.filter((r) => r.apiKey === keyVal || r.apiKey === key.name);
      return {
        ...key,
        keyVal,
        today: sumRows(related, (r) => todayKey(r.timestamp) === todayKey()),
        month: sumRows(related, (r) => monthKey(r.timestamp) === monthKey()),
        last24h: sumRows(related, (r) => inRange(r.timestamp, 86400000)),
      };
    });
  }, [keys, stats, history]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main">API Keys</h1>
          <p className="text-sm text-text-muted mt-1">Keys, free tier status, usage metrics per key.</p>
        </div>
        <div className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-mono text-brand-500">
          Keys ({rows.length})
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      <div className="rounded-2xl border border-border-subtle bg-surface/70 backdrop-blur-xl overflow-hidden">
        <div className="divide-y divide-border-subtle">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-text-muted">No API keys yet.</div>
          ) : rows.map((key) => (
            <div key={key.id || key.keyVal} className="p-5 space-y-4 hover:bg-white/[0.02]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-text-main">{key.name || key.keyVal}</span>
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-400 border border-green-500/20">active</span>
                    <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-500 border border-brand-500/20">Free Tier</span>
                  </div>
                  <div className="font-mono text-xs text-text-muted mt-1 truncate max-w-[640px]">{key.keyVal}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <MetricBlock title="Today" data={key.today} />
                <MetricBlock title="This Month" data={key.month} />
                <MetricBlock title="Last 24h" data={key.last24h} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
