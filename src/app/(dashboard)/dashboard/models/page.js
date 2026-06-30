"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles, Cpu } from "lucide-react";

const FALLBACK_MODELS = [
  { id: "minimax-m3", provider: "minimax", label: "MiniMax-M3", context: "200K", modality: "text", featured: true },
  { id: "minimax-m2.5", provider: "minimax", label: "MiniMax-M2.5", context: "200K", modality: "text" },
  { id: "deepseek-v4-pro", provider: "deepseek", label: "DeepSeek V4 Pro", context: "128K", modality: "text" },
  { id: "deepseek-4-flash", provider: "deepseek", label: "DeepSeek 4 Flash", context: "128K", modality: "text" },
  { id: "qwen3-coder-flash", provider: "qwen", label: "Qwen3 Coder Flash", context: "128K", modality: "text" },
  { id: "kimi-k2.6", provider: "kimi", label: "Kimi K2.6", context: "256K", modality: "text" },
  { id: "kimi-k2.5", provider: "kimi", label: "Kimi K2.5", context: "256K", modality: "text" },
  { id: "glm-5", provider: "zhipu", label: "GLM-5", context: "128K", modality: "text" },
];

export default function ModelsPage() {
  const [models, setModels] = useState(FALLBACK_MODELS);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.models && Array.isArray(data.models) && data.models.length) {
          setModels(data.models);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = models.filter((m) =>
    `${m.label} ${m.id} ${m.provider}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-6 text-[#e2e8f0]">
      <div className="flex flex-col gap-2">
        <h1 className="text-[26px] font-semibold tracking-tight text-white">Models</h1>
        <p className="text-[13px] text-[#94a3b8]">Daftar model AI yang tersedia lewat dorouter. Filter cepat berdasarkan provider atau nama.</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-[#1f2a44] bg-[#0f1730] p-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-[#1f2a44] bg-[#0b132a] text-[#94a3b8]">
          <Search size={16} />
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari model atau provider…"
          className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-[#475569]"
        />
        <span className="rounded-full border border-[#1f2a44] bg-[#0b132a] px-3 py-1 text-[11px] text-[#94a3b8]">{filtered.length} model</span>
      </div>

      {loading && (
        <div className="rounded-2xl border border-[#1f2a44] bg-[#0f1730] p-6 text-center text-[12px] text-[#94a3b8]">Memuat model…</div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="rounded-2xl border border-[#1f2a44] bg-[#0f1730] p-5 transition-colors hover:border-[#38bdf8]/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-[#1f2a44] bg-[#0b132a] text-[#38bdf8]">
                  <Cpu size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-semibold text-white">{m.label || m.id}</h3>
                    {m.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#38bdf8]/30 bg-[#38bdf8]/10 px-2 py-0.5 text-[10px] font-semibold text-[#38bdf8]">
                        <Sparkles size={10} /> Featured
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[#64748b]">{m.provider}</div>
                </div>
              </div>
              <span className="rounded-full border border-[#1f2a44] bg-[#0b132a] px-2.5 py-1 text-[11px] text-[#94a3b8]">{m.context || "—"} ctx</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <div className="text-[#64748b]">Modality</div>
                <div className="text-white">{m.modality || "text"}</div>
              </div>
              <div>
                <div className="text-[#64748b]">Slug</div>
                <div className="truncate font-mono text-[#cbd5f5]">{m.id}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-[#1f2a44] bg-[#0f1730] p-6 text-center text-[12px] text-[#94a3b8]">Tidak ada model yang cocok.</div>
      )}
    </div>
  );
}