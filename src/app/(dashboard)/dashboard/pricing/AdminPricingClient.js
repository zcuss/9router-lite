"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, RotateCcw, Save, Search } from "lucide-react";
import { getDefaultPricing, formatCost } from "@/shared/constants/pricing.js";

export default function PricingSettingsPage() {
  const [pricingData, setPricingData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [currentPricing, setCurrentPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeProvider, setActiveProvider] = useState("all");
  const [dirty, setDirty] = useState(false);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = await response.json();
        setPricingData(data || {});
        setOriginalData(data || {});
        setCurrentPricing(data);
      } else {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
        setOriginalData(defaults);
        setCurrentPricing(defaults);
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      const defaults = getDefaultPricing();
      setPricingData(defaults);
      setOriginalData(defaults);
      setCurrentPricing(defaults);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPricing();
  }, []);

  useEffect(() => {
    setDirty(JSON.stringify(pricingData) !== JSON.stringify(originalData));
  }, [pricingData, originalData]);

  const handlePricingChange = (provider, model, field, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return;
    setPricingData((prev) => {
      const newData = { ...prev };
      if (!newData[provider]) newData[provider] = {};
      if (!newData[provider][model]) newData[provider][model] = {};
      newData[provider][model] = { ...newData[provider][model], [field]: numValue };
      return newData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/pricing", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricingData)
      });
      if (response.ok) {
        setOriginalData(pricingData);
        setDirty(false);
      } else {
        const error = await response.json();
        alert(`Gagal menyimpan tarif: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      alert("Gagal menyimpan tarif");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset semua tarif ke default? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) {
        const defaults = getDefaultPricing();
        setPricingData(defaults);
        setOriginalData(defaults);
        setDirty(false);
      }
    } catch (error) {
      console.error("Failed to reset pricing:", error);
      alert("Gagal mereset tarif");
    }
  };

  const handlePricingUpdated = () => {
    loadPricing();
  };

  const allProviders = useMemo(() => Object.keys(pricingData).sort(), [pricingData]);
  const pricingFields = ["input", "output", "cached", "reasoning", "cache_creation"];

  const filteredProviders = activeProvider === "all" ? allProviders : [activeProvider];

  const getModelCount = () => {
    let count = 0;
    for (const provider in pricingData) {
      count += Object.keys(pricingData[provider]).length;
    }
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} strokeWidth={1.8} className="animate-spin text-text-muted" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Tabel Tarif Model</h1>
          <p className="text-sm text-text-muted mt-1">
            Atur tarif per-juta-token untuk setiap model. Format: $/1M token.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-amber-400">Perubahan belum disimpan</span>}
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded border border-red-500/30 transition-colors"
          >
            <RotateCcw size={14} strokeWidth={1.8} /> Reset Default
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save size={14} strokeWidth={1.8} /> {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border-subtle bg-black/20 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted/60 mb-1">Total Model</div>
          <div className="text-2xl font-bold text-text-main">{getModelCount()}</div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-black/20 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted/60 mb-1">Provider</div>
          <div className="text-2xl font-bold text-text-main">{allProviders.length}</div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-black/20 p-3">
          <div className="text-[10px] uppercase tracking-[0.18em] text-text-muted/60 mb-1">Status</div>
          <div className="text-2xl font-bold text-emerald-400">Aktif</div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama model..."
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={activeProvider}
          onChange={(e) => setActiveProvider(e.target.value)}
          className="px-3 py-2 bg-surface border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-primary"
        >
          <option value="all">Semua Provider ({allProviders.length})</option>
          {allProviders.map((p) => (
            <option key={p} value={p}>{p.toUpperCase()} ({Object.keys(pricingData[p] || {}).length})</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filteredProviders.length === 0 ? (
          <div className="rounded-xl border border-border-subtle bg-black/20 p-8 text-center text-text-muted">
            Tidak ada data tarif.
          </div>
        ) : (
          filteredProviders.map((provider) => {
            const models = Object.keys(pricingData[provider] || {})
              .filter((m) => !search || m.toLowerCase().includes(search.toLowerCase()))
              .sort();
            if (models.length === 0) return null;
            return (
              <div key={provider} className="rounded-xl border border-border-subtle bg-surface/70 backdrop-blur-xl overflow-hidden">
                <div className="px-4 py-2 border-b border-border-subtle bg-black/20 flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-main uppercase tracking-wider">{provider}</span>
                  <span className="text-xs text-text-muted">{models.length} model</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-black/30 text-text-muted uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-2 text-left">Model</th>
                        {pricingFields.map((f) => (
                          <th key={f} className="px-3 py-2 text-right">
                            {f === "input" ? "Input" :
                             f === "output" ? "Output" :
                             f === "cached" ? "Cached" :
                             f === "reasoning" ? "Reasoning" : "Cache Create"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {models.map((model) => (
                        <tr key={model} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-2 font-mono text-xs text-text-main">{model}</td>
                          {pricingFields.map((field) => (
                            <td key={field} className="px-3 py-1.5">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={pricingData[provider][model][field] ?? 0}
                                onChange={(e) => handlePricingChange(provider, model, field, e.target.value)}
                                className="w-20 px-2 py-1 text-right bg-bg-base border border-border-subtle rounded text-xs font-mono focus:outline-none focus:border-primary"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && <PricingModal isOpen={showModal} onClose={() => setShowModal(false)} onSave={handlePricingUpdated} />}
    </div>
  );
}

function PricingModal({ isOpen, onClose, onSave }) {
  if (!isOpen) return null;
  return null;
}
