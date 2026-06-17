"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { getDefaultPricing } from "@/shared/constants/pricing.js";

export default function PricingModal({ isOpen, onClose, onSave }) {
  const [pricingData, setPricingData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen) loadPricing();
  }, [isOpen]);

  const loadPricing = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pricing");
      if (response.ok) {
        const data = await response.json();
        setPricingData(data);
      } else {
        setPricingData(getDefaultPricing());
      }
    } catch (error) {
      console.error("Failed to load pricing:", error);
      setPricingData(getDefaultPricing());
    } finally {
      setLoading(false);
    }
  };

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
        body: JSON.stringify(pricingData),
      });
      if (response.ok) {
        onSave?.();
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to save pricing: ${error.error}`);
      }
    } catch (error) {
      console.error("Failed to save pricing:", error);
      alert("Failed to save pricing");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all pricing to defaults? This cannot be undone.")) return;
    try {
      const response = await fetch("/api/pricing", { method: "DELETE" });
      if (response.ok) {
        setPricingData(getDefaultPricing());
      }
    } catch (error) {
      console.error("Failed to reset pricing:", error);
      alert("Failed to reset pricing");
    }
  };

  const allProviders = Object.keys(pricingData).sort();
  const pricingFields = [
    { key: "input", label: "Input" },
    { key: "output", label: "Output" },
    { key: "cached", label: "Cached" },
    { key: "reasoning", label: "Reasoning" },
    { key: "cache_creation", label: "Cache Creation" },
  ];

  const q = search.trim().toLowerCase();
  const filteredProviders = allProviders
    .map((p) => {
      const models = Object.keys(pricingData[p] || {}).filter((m) =>
        !q ? true : (m + " " + p).toLowerCase().includes(q)
      );
      return { provider: p, models };
    })
    .filter((g) => g.models.length > 0);

  const totalModels = filteredProviders.reduce((acc, g) => acc + g.models.length, 0);

  const footer = (
    <div className="flex w-full items-center justify-between gap-2">
      <Button variant="danger-soft" onClick={handleReset} disabled={saving}>
        Reset Defaults
      </Button>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pricing Configuration"
      size="full"
      showTrafficLights={false}
      footer={footer}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            <span className="font-semibold text-[var(--color-text-main)]">Format:</span> dollars per million tokens ($/1M). Cached biasanya 50% dari input, reasoning fallback ke output, cache creation fallback ke input.
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="font-mono uppercase tracking-wider text-[10px]">
              {filteredProviders.length} provider · {totalModels} model
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-1.5">
          <span className="material-symbols-outlined text-[18px] text-[var(--color-text-muted)]">search</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari provider atau model…"
            className="w-full bg-transparent text-sm text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-subtle)]"
          />
          {q && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">Loading pricing data…</div>
        ) : filteredProviders.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-text-muted)]">
            {q ? `No pricing entries match "${q}".` : "No pricing data available."}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProviders.map(({ provider, models }) => (
              <div
                key={provider}
                className="overflow-hidden rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)]"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-md bg-[var(--color-accent)]/15 text-[10px] font-bold text-[var(--color-accent-fg)]">
                      {provider.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-[var(--color-text-main)]">
                      {provider}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">
                      · {models.length} model
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
                        <th className="px-3 py-2">Model</th>
                        {pricingFields.map((f) => (
                          <th key={f.key} className="px-3 py-2 text-right">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-subtle)]">
                      {models.map((model) => {
                        const m = pricingData[provider][model] || {};
                        return (
                          <tr key={model} className="hover:bg-[var(--color-surface-2)]/60">
                            <td className="px-3 py-1.5 font-mono text-xs text-[var(--color-text-main)]">{model}</td>
                            {pricingFields.map((f) => (
                              <td key={f.key} className="px-3 py-1.5">
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-[10px] text-[var(--color-text-subtle)]">$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={m[f.key] ?? 0}
                                    onChange={(e) => handlePricingChange(provider, model, f.key, e.target.value)}
                                    className="w-20 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-2 py-1 text-right font-mono text-xs text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                                  />
                                </div>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
