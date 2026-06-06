"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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

const presetOptions = [
  {
    id: "support",
    label: "Support Copilot",
    description: "Fast, practical, low-fluff answers for daily ops.",
    values: {
      aiPersonaName: "Support Copilot",
      aiPersonaTone: "balanced",
      aiPersonaBehavior: "Helpful, concise, operationally aware, and solution-first.",
      aiSystemPrompt: "You are a support-focused AI assistant routed through 9Router Lite. Give direct answers, explain tradeoffs briefly, and prioritize practical next steps.",
    },
  },
  {
    id: "architect",
    label: "System Architect",
    description: "Technical, structured, and explicit about risks.",
    values: {
      aiPersonaName: "System Architect",
      aiPersonaTone: "technical",
      aiPersonaBehavior: "Technical, structured, cautious about assumptions, and explicit about system tradeoffs.",
      aiSystemPrompt: "You are a senior systems architect routed through 9Router Lite. Prefer precise reasoning, clear architecture guidance, and explicit risk notes when requirements are ambiguous.",
    },
  },
  {
    id: "indo",
    label: "Indonesian Helper",
    description: "Natural Indonesian-first tone for local teams.",
    values: {
      aiPersonaName: "Asisten Tim Indonesia",
      aiPersonaTone: "friendly",
      aiPersonaBehavior: "Ramah, jelas, tidak bertele-tele, dan nyaman dipakai tim Indonesia.",
      aiSystemPrompt: "Kamu adalah asisten AI yang dirutekan melalui 9Router Lite. Utamakan Bahasa Indonesia yang natural, jelas, dan langsung ke solusi, kecuali pengguna meminta bahasa lain.",
    },
  },
];

const promptSuggestions = [
  "Ask one clarifying question only when truly required.",
  "Prefer bullet points for steps and action items.",
  "State assumptions explicitly before giving advice.",
  "Keep answers concise unless the user asks for detail.",
  "Warn about risky or destructive operations clearly.",
  "Use Indonesian by default unless the user asks otherwise.",
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
  const fileInputRef = useRef(null);

  const preview = useMemo(() => buildPreview(form), [form]);
  const behaviorLength = form.aiPersonaBehavior.trim().length;
  const promptLength = form.aiSystemPrompt.trim().length;
  const estimatedTokens = Math.max(1, Math.round((form.aiSystemPrompt.length + form.aiPersonaBehavior.length) / 4));

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

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      ...preset.values,
      aiTuningEnabled: true,
    }));
    toast.success(`Preset applied: ${preset.label}`);
  };

  const appendSuggestion = (suggestion) => {
    setForm((prev) => ({
      ...prev,
      aiSystemPrompt: prev.aiSystemPrompt.includes(suggestion)
        ? prev.aiSystemPrompt
        : `${prev.aiSystemPrompt.trim()}\n- ${suggestion}`.trim(),
    }));
  };

  const handleExport = () => {
    try {
      const content = JSON.stringify(form, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[.:]/g, "-");
      anchor.href = url;
      anchor.download = `9router-persona-${form.aiPersonaName.toLowerCase().replace(/\s+/g, "-")}-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Persona exported successfully");
    } catch (error) {
      toast.error("Failed to export persona: " + error.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setForm({
        aiTuningEnabled: parsed.aiTuningEnabled === true,
        aiPersonaName: parsed.aiPersonaName || DEFAULT_FORM.aiPersonaName,
        aiPersonaTone: parsed.aiPersonaTone || DEFAULT_FORM.aiPersonaTone,
        aiPersonaBehavior: parsed.aiPersonaBehavior || DEFAULT_FORM.aiPersonaBehavior,
        aiSystemPrompt: parsed.aiSystemPrompt || DEFAULT_FORM.aiSystemPrompt,
      });
      toast.success("Persona imported successfully. Click 'Save tuning' to persist.");
    } catch (error) {
      toast.error("Failed to import persona: " + error.message);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
        <div className="space-y-6">
          <Card title="Persona Configuration" icon="tune">
            <div className="space-y-5">
              {initialLoading && (
                <div className="text-sm text-text-muted">Loading AI tuning settings...</div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                  <p className="text-xs text-text-muted">Status</p>
                  <p className="mt-1 text-sm font-semibold text-text-main">{form.aiTuningEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                  <p className="text-xs text-text-muted">Behavior chars</p>
                  <p className="mt-1 text-sm font-semibold text-text-main">{behaviorLength}</p>
                </div>
                <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
                  <p className="text-xs text-text-muted">Estimated prompt tokens</p>
                  <p className="mt-1 text-sm font-semibold text-text-main">~{estimatedTokens}</p>
                </div>
              </div>

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

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-main">Quick presets</p>
                  <p className="text-xs text-text-muted">Start from a tuned persona, then customize it.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {presetOptions.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-xl border border-border-subtle bg-surface p-4 text-left transition hover:border-primary/40 hover:bg-surface-2"
                    >
                      <p className="text-sm font-semibold text-text-main">{preset.label}</p>
                      <p className="mt-1 text-xs text-text-muted">{preset.description}</p>
                    </button>
                  ))}
                </div>
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
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-text-main">Behavior / Perilaku</label>
                  <span className="text-xs text-text-muted">{behaviorLength} chars</span>
                </div>
                <textarea
                  className="w-full min-h-28 rounded-xl border border-border-subtle bg-surface px-3 py-2 text-sm text-text-main outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="Helpful, direct, Indonesian-friendly, never too verbose..."
                  value={form.aiPersonaBehavior}
                  onChange={(e) => updateField("aiPersonaBehavior", e.target.value)}
                />
                <p className="text-xs text-text-muted">Describe sifat, aturan respons, batasan, dan gaya kerja AI.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-text-main">Custom system prompt</label>
                  <span className="text-xs text-text-muted">{promptLength} chars</span>
                </div>
                <textarea
                  className="w-full min-h-40 rounded-xl border border-border-subtle bg-surface px-3 py-2 font-mono text-xs text-text-main outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="You are GPT OSS Lite..."
                  value={form.aiSystemPrompt}
                  onChange={(e) => updateField("aiSystemPrompt", e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => appendSuggestion(suggestion)}
                      className="rounded-full border border-border-subtle bg-surface-2 px-3 py-1 text-xs text-text-main transition hover:border-primary/40 hover:text-primary"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted">Prompt ini disimpan sebagai konfigurasi persona global.</p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="primary" onClick={handleSave} loading={saving || initialLoading}>
                  Save tuning
                </Button>
                <Button variant="secondary" onClick={handleReset} disabled={saving || initialLoading}>
                  Reset defaults
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={initialLoading}>
                  Export Persona
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={initialLoading}>
                  Import Persona
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImport}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
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

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-text-main">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">Preview summary</p>
                <ul className="mt-2 space-y-1 text-text-muted">
                  <li>• Tone: {form.aiPersonaTone}</li>
                  <li>• Behavior length: {behaviorLength} chars</li>
                  <li>• Prompt size estimate: ~{estimatedTokens} tokens</li>
                </ul>
              </div>

              <pre className="whitespace-pre-wrap rounded-xl border border-border-subtle bg-black/90 p-4 text-xs text-green-200 overflow-auto max-h-[420px]">
                {preview}
              </pre>

              <p className="text-xs text-text-muted">
                Use this page to tune GPT OSS or any routed model identity. The saved values are persisted in app settings.
              </p>
            </div>
          </Card>

          <Card title="Recommended workflow" icon="tips_and_updates" padding="sm">
            <div className="space-y-2 text-sm text-text-muted">
              <p><span className="font-semibold text-text-main">1.</span> Pick the closest preset.</p>
              <p><span className="font-semibold text-text-main">2.</span> Tighten behavior rules in one sentence.</p>
              <p><span className="font-semibold text-text-main">3.</span> Add only essential prompt constraints.</p>
              <p><span className="font-semibold text-text-main">4.</span> Save, test, then iterate from user feedback.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
