"use client";

export const dynamic = "force-dynamic";
import { useEffect, useMemo, useState } from "react";
import { Send, Search, Check, Loader2 } from "lucide-react";
import { AI_MODELS } from "@/shared/constants/models";

export default function AdminModelsPage() {
  const [published, setPublished] = useState({});
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models/publish")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const rows = d?.models || d?.items || [];
        const map = {};
        rows.forEach((row) => {
          map[row.model || row.modelId || row.id] = true;
        });
        setPublished(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const allModels = useMemo(() => {
    if (Array.isArray(AI_MODELS)) return AI_MODELS;
    if (AI_MODELS && typeof AI_MODELS === "object") return Object.values(AI_MODELS).flat();
    return [];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allModels;
    return allModels.filter((m) => {
      const id = typeof m === "string" ? m : m.id || m.model || "";
      const label = typeof m === "string" ? m : m.label || m.name || "";
      return id.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    });
  }, [allModels, query]);

  const toggle = async (item) => {
    const id = typeof item === "string" ? item : item.id || item.model;
    if (!id) return;

    setSaving(id);
    const enabled = !!published[id];
    try {
      if (enabled) {
        await fetch(`/api/models/publish/${encodeURIComponent(id)}`, { method: "DELETE" });
        setPublished((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        await fetch("/api/models/publish", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ model: id, action: "publish" }),
        });
        setPublished((prev) => ({ ...prev, [id]: true }));
      }
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-text-subtle">Controls</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Publish models</h1>
        </div>
        <div className="chip">{Object.keys(published).length} live</div>
      </header>

      <section className="rounded-lg border border-border-subtle bg-surface p-5 space-y-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search model…"
            className="w-full h-10 pl-9 pr-3 rounded-md border border-border-subtle bg-transparent text-[13px] outline-none focus:border-text-main"
          />
        </div>

        {loading ? (
          <div className="text-[12px] text-text-subtle">Loading models…</div>
        ) : (
          <div className="rounded-lg border border-border-subtle overflow-hidden">
            <div className="divide-y divide-border-subtle">
              {filtered.map((item, i) => {
                const id = typeof item === "string" ? item : item.id || item.model || `model-${i}`;
                const label = typeof item === "string" ? item : item.label || item.name || id;
                const enabled = !!published[id];
                const busy = saving === id;
                return (
                  <div key={id} className="px-4 py-3 flex items-center gap-3 justify-between">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium truncate">{label}</div>
                      <div className="text-[10px] text-text-subtle font-mono truncate">{id}</div>
                    </div>
                    <button
                      onClick={() => toggle(item)}
                      disabled={busy}
                      className={`h-8 px-3 rounded-md text-[11px] font-medium flex items-center gap-1.5 ${
                        enabled
                          ? "bg-lime-300 text-black hover:bg-lime-200"
                          : "border border-border-subtle hover:border-text-main"
                      } disabled:opacity-50`}
                    >
                      {busy ? <Loader2 size={12} className="animate-spin" /> : enabled ? <Check size={12} /> : <Send size={12} />}
                      {enabled ? "Published" : "Publish"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
