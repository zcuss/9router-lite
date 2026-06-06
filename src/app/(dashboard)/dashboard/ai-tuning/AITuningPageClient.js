"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Button, Input, Select, Toggle } from "@/shared/components";
import { Toaster, toast } from "sonner";

const DEFAULT_FORM = {
  aiTuningEnabled: false,
  aiPersonaName: "9Router Lite Assistant",
  aiPersonaTone: "balanced",
  aiPersonaBehavior: "Helpful, concise, technical, and honest.",
  aiSystemPrompt: "You are a helpful AI assistant routed through 9Router Lite. Follow the user's instructions, keep answers clear, and adapt to the configured persona.",
};

const toneOptions = [
  { value: "balanced", label: "Balanced / Seimbang" },
  { value: "friendly", label: "Friendly / Ramah" },
  { value: "professional", label: "Professional / Profesional" },
  { value: "strict", label: "Strict / Tegas" },
  { value: "creative", label: "Creative / Kreatif" },
  { value: "technical", label: "Technical / Teknis" },
];

function buildPreview(form) {
  return [
    `Assistant name: ${form.aiPersonaName || "AI Assistant"}`,
    `Tone: ${form.aiPersonaTone || "balanced"}`,
    `Behavior: ${form.aiPersonaBehavior || "-"}`,
    "",
    form.aiSystemPrompt || "",
  ].join("\n");
}

export default function AITuningPageClient() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const preview = useMemo(() => buildPreview(form), [form]);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json();
        if (!mounted) return;
        setForm({
          aiTuningEnabled: data?.aiTuningEnabled === true,
          aiPersonaName: data?.aiPersonaName || DEFAULT_FORM.aiPersonaName,
          aiPersonaTone: data?.aiPersonaTone || DEFAULT_FORM.aiPersonaTone,
          aiPersonaBehavior: data?.aiPersonaBehavior || DEFAULT_FORM.aiPersonaBehavior,
          aiSystemPrompt: data?.aiSystemPrompt || DEFAULT_FORM.aiSystemPrompt,
        });
      } catch (error) {
        if (mounted) toast.error("Failed to load AI tuning settings: " + error.message);
      } finally {
        if (mounted) setInitialLoading(false);
      }
    }

    loadSettings();
    return () => { mounted = false; };
  }, []);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save AI tuning settings");
      setForm((prev) => ({ ...prev, ...data }));
      toast.success("AI tuning settings saved");
    } catch (error) {
      toast.error(error.message || "Failed to save AI tuning settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULT_FORM);
  };

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <Toaster richColors />
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-[10px] bg-surface border border-border-subtle text-text-muted">
          <span className="material-symbols-outlined text-[24px]">psychology</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-main">AI Tuning</h1>
          <p className="text-sm text-text-muted">Tune assistant name, personality, behavior, and system prompt.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card title="Persona Configuration" icon="tune">
          <div className="space-y-5">
            {initialLoading && (
              <div className="text-sm text-text-muted">Loading AI tuning settings...</div>
            )}

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border-subtle bg-surface-2 p-4">
              <div>
                <p className="text-sm font-semibold text-text-main">Enable AI tuning</p>
                <p className="text-xs text-text-muted">When enabled, these persona rules can be used by routing/chat layers.</p>
              </div>
              <Toggle
                checked={form.aiTuningEnabled}
                onChange={(value) => updateField("aiTuningEnabled", value)}
              />
            </div>

            <Input
              label="Assistant name / Nama AI"
              type="text"
              placeholder="GPT OSS Lite"
              value={form.aiPersonaName}
              onChange={(e) => updateField("aiPersonaName", e.target.value)}
              hint="Example: GPT OSS Lite, Jarvis, Router Copilot"
            />

            <Select
              label="Tone / Gaya bicara"
              options={toneOptions}
              value={form.aiPersonaTone}
              onChange={(e) => updateField("aiPersonaTone", e.target.value)}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">Behavior / Perilaku</label>
              <textarea
                className="w-full min-h-28 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-text-main outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Helpful, direct, Indonesian-friendly, never too verbose..."
                value={form.aiPersonaBehavior}
                onChange={(e) => updateField("aiPersonaBehavior", e.target.value)}
              />
              <p className="text-xs text-text-muted">Describe sifat, aturan respons, batasan, dan gaya kerja AI.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main">Custom system prompt</label>
              <textarea
                className="w-full min-h-40 rounded-xl border border-border-subtle bg-surface px-3 py-2 font-mono text-xs text-text-main outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="You are GPT OSS Lite..."
                value={form.aiSystemPrompt}
                onChange={(e) => updateField("aiSystemPrompt", e.target.value)}
              />
              <p className="text-xs text-text-muted">Prompt ini disimpan sebagai konfigurasi persona global.</p>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button variant="primary" onClick={handleSave} loading={saving || initialLoading}>
                Save tuning
              </Button>
              <Button variant="secondary" onClick={handleReset} disabled={saving || initialLoading}>
                Reset defaults
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Persona Preview" icon="visibility">
          <div className="space-y-4">
            <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold">
                  {(form.aiPersonaName || "AI").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-main">{form.aiPersonaName || "AI Assistant"}</p>
                  <p className="text-xs text-text-muted">{form.aiTuningEnabled ? "Tuning enabled" : "Tuning disabled"}</p>
                </div>
              </div>
            </div>

            <pre className="whitespace-pre-wrap rounded-xl border border-border-subtle bg-black/90 p-4 text-xs text-green-200 overflow-auto max-h-[420px]">
              {preview}
            </pre>

            <p className="text-xs text-text-muted">
              Use this page to tune GPT OSS or any routed model identity. The saved values are persisted in app settings.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
