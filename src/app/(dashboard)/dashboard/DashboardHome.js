"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Wallet, KeyRound, ArrowUpRight, ArrowDownRight, Activity, Copy,
  Plus, ExternalLink, Zap, ChevronRight, Check, Sparkles, Eye, EyeOff, X, Trash2,
} from "lucide-react";
import useRoleStore, { useEffectiveRole } from "@/store/roleStore";

const fmtUSD = (cents) => {
  const n = (Number(cents) || 0) / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
};

export default function DashboardHome() {
  const effectiveRole = useEffectiveRole();
  const username = useRoleStore((s) => s.username);

  const [balance, setBalance] = useState(null);
  const [keys, setKeys] = useState([]);
  const [stats, setStats] = useState(null);
  const [endpoint, setEndpoint] = useState({ url: typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "/api/v1" });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealId, setRevealId] = useState(null);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, kRes, sRes] = await Promise.all([
        fetch("/api/wallet/balance").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/keys").then((r) => (r.ok ? r.json() : null)),
        effectiveRole !== "user" ? fetch("/api/admin/stats").then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null),
      ]);
      if (bRes?.balance) setBalance(bRes.balance);
      if (kRes?.keys) setKeys(kRes.keys);
      if (sRes) setStats(sRes);
    } catch (e) {
      console.error("DashboardHome load error:", e);
    } finally {
      setLoading(false);
    }
  }, [effectiveRole]);

  useEffect(() => { load(); }, [load]);

  const total = balance
    ? (Number(balance.balanceCents || 0) + Number(balance.voucherCents || 0)) / 100
    : 0;
  const spent = Number(balance?.lifetimeSpentCents || 0) / 100;
  const topped = Number(balance?.lifetimeTopupCents || 0) / 100;

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1500);
  };

  const createKey = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const r = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const d = await r.json();
      if (r.ok && d.key) {
        setKeys((p) => [d.key, ...p]);
        setRevealId(d.key.id);
        setNewName("");
        setShowCreate(false);
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id) => {
    if (!confirm("Delete this API key?")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((p) => p.filter((k) => k.id !== id));
  };

  const isAdmin = effectiveRole === "admin" || effectiveRole === "dev";

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-6xl mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-subtle">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
            Hi, {username || "there"}.
          </h1>
        </div>
        <Link
          href="/dashboard/endpoint"
          className="h-9 px-4 rounded-md bg-text-main text-surface text-[12px] font-medium flex items-center gap-2 hover:opacity-90"
        >
          Manage keys <ArrowUpRight size={13} strokeWidth={2} />
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border border-border-subtle p-5 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">Balance</span>
            <Wallet size={14} strokeWidth={1.6} className="text-text-subtle" />
          </div>
          <div className="text-3xl font-bold tabular-nums tracking-tight">
            {loading ? "—" : fmtUSD(Math.round(total * 100))}
          </div>
          <div className="mt-2 text-[11px] text-text-subtle">
            Top-ups {fmtUSD(Math.round(topped * 100))} · Spent {fmtUSD(Math.round(spent * 100))}
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle p-5 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">API keys</span>
            <KeyRound size={14} strokeWidth={1.6} className="text-text-subtle" />
          </div>
          <div className="text-3xl font-bold tabular-nums tracking-tight">
            {loading ? "—" : keys.filter((k) => k.isActive).length}
          </div>
          <div className="mt-2 text-[11px] text-text-subtle">Active, ready to use</div>
        </div>

        <div className="rounded-lg border border-border-subtle p-5 bg-surface">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] uppercase tracking-wider text-text-subtle font-medium">Endpoint</span>
            <Zap size={14} strokeWidth={1.6} className="text-text-subtle" />
          </div>
          <div className="text-[13px] font-mono truncate text-text-main">
            {endpoint?.url || (loading ? "Loading…" : "Not configured")}
          </div>
          <Link href="/dashboard/endpoint" className="mt-2 text-[11px] text-text-main inline-flex items-center gap-1 hover:underline">
            View setup <ChevronRight size={11} />
          </Link>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-border-subtle p-5 bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold">Network</h2>
            <span className="chip">{effectiveRole}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Users</div>
              <div className="text-xl font-bold tabular-nums mt-1">{stats?.userCount ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Keys</div>
              <div className="text-xl font-bold tabular-nums mt-1">{stats?.keyCount ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Requests · 24h</div>
              <div className="text-xl font-bold tabular-nums mt-1">{stats?.req24h ?? "—"}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-text-subtle">Spend · 24h</div>
              <div className="text-xl font-bold tabular-nums mt-1">
                {stats?.spend24h ? fmtUSD(stats.spend24h) : "—"}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">Your API keys</h2>
          <button
            onClick={() => setShowCreate(true)}
            className="h-8 px-3 rounded-md border border-border-subtle text-[11px] font-medium hover:border-text-main flex items-center gap-1.5"
          >
            <Plus size={12} strokeWidth={2} /> New key
          </button>
        </div>

        {showCreate && (
          <div className="px-5 py-4 border-b border-border-subtle bg-surface-2 flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              placeholder="Key name (e.g. my-app)"
              className="flex-1 h-9 px-3 rounded-md border border-border-subtle bg-surface text-[12px] outline-none focus:border-text-main"
            />
            <button
              onClick={createKey}
              disabled={creating || !newName.trim()}
              className="h-9 px-4 rounded-md bg-text-main text-surface text-[12px] font-medium disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewName(""); }}
              className="h-9 w-9 rounded-md border border-border-subtle text-text-muted hover:text-text-main flex items-center justify-center"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="px-5 py-12 text-center text-[12px] text-text-subtle">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-[12px] text-text-subtle">No keys yet.</div>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 h-8 px-3 rounded-md bg-text-main text-surface text-[11px] font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={12} strokeWidth={2} /> Create your first key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {keys.map((k) => (
              <div key={k.id} className="px-5 py-3.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-surface-2 flex items-center justify-center shrink-0">
                  <KeyRound size={14} strokeWidth={1.6} className="text-text-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium truncate">{k.name || "Unnamed"}</div>
                  <div className="text-[10px] text-text-subtle font-mono truncate">
                    {revealId === k.id ? (k.key || k.apiKey) : "••••••••••" + (k.lastFour || "")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRevealId(revealId === k.id ? null : k.id)}
                    className="h-7 w-7 rounded text-text-muted hover:text-text-main hover:bg-surface-2 flex items-center justify-center"
                    title={revealId === k.id ? "Hide" : "Reveal"}
                  >
                    {revealId === k.id ? <EyeOff size={12} /> : <Eye size={12} />}
                  </button>
                  <button
                    onClick={() => copyText(k.key || k.apiKey, k.id)}
                    className="h-7 w-7 rounded text-text-muted hover:text-text-main hover:bg-surface-2 flex items-center justify-center"
                    title="Copy"
                  >
                    {copied === k.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  </button>
                  <button
                    onClick={() => deleteKey(k.id)}
                    className="h-7 w-7 rounded text-text-muted hover:text-danger hover:bg-surface-2 flex items-center justify-center"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
