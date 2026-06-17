"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Card, Button, Input, Select, Toggle } from "@/shared/components";
import { Toaster, toast } from "sonner";

const GLOBAL_TARGET = "__global__";
const COMBO_TARGET = "combo";
const MODEL_TARGET = "model";

const DEFAULT_FORM = {
  enabled: false,
  name: "",
  tone: "balanced",
  behavior: "Helpful, concise, technical, and honest.",
  systemPrompt: "You are a helpful AI assistant routed through 9Router Lite. Follow the user's instructions, keep answers clear, and adapt to the configured persona.",
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
      name: "Support Copilot",
      tone: "balanced",
      behavior: "Helpful, concise, operationally aware, and solution-first.",
      systemPrompt: "You are a support-focused AI assistant routed through 9Router Lite. Give direct answers, explain tradeoffs briefly, and prioritize practical next steps.",
    },
  },
  {
    id: "architect",
    label: "System Architect",
    description: "Technical, structured, and explicit about risks.",
    values: {
      name: "System Architect",
      tone: "technical",
      behavior: "Technical, structured, cautious about assumptions, and explicit about system tradeoffs.",
      systemPrompt: "You are a senior systems architect routed through 9Router Lite. Prefer precise reasoning, clear architecture guidance, and explicit risk notes when requirements are ambiguous.",
    },
  },
  {
    id: "indo",
    label: "Indonesian Helper",
    description: "Natural Indonesian-first tone for local teams.",
    values: {
      name: "Asisten Tim Indonesia",
      tone: "friendly",
      behavior: "Ramah, jelas, tidak bertele-tele, dan nyaman dipakai tim Indonesia.",
      systemPrompt: "Kamu adalah asisten AI yang dirutekan melalui 9Router Lite. Utamakan Bahasa Indonesia yang natural, jelas, dan langsung ke solusi, kecuali pengguna meminta bahasa lain.",
    },
  },
  {
    id: "zero",
    label: "Zero 1.1 (compressed Indonesian)",
    description: "Telegraphic, arrow-style, ultra-terse bilingual helper.",
    values: {
      name: "Zero 1.1",
      tone: "strict",
      behavior: "Ultra-terse telegraphic. Abbreviate (DB/auth/config/req/res/fn/impl), strip conjunctions, use arrows for causality. Pattern: [thing] → [result]. Indonesian narrative.",
      systemPrompt: "You are Zero 1.1, an ultra-terse AI assistant routed through 9Router Lite. Respond in compressed Indonesian by default. Use arrows (X → Y), drop fillers, abbreviate common terms. Keep English code identifiers. Be direct, no preamble.",
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
  "When addressed by your assigned name, acknowledge it once and continue in persona.",
];

function buildPreview(form) {
  return [
    `Assistant name: ${form.name || "AI Assistant"}`,
    `Tone: ${form.tone || "balanced"}`,
    `Behavior: ${form.behavior || "-"}`,
    "",
    form.systemPrompt || "",
  ].join("\n");
}

function parseTargetValue(value) {
  if (!value || value === GLOBAL_TARGET) return { type: "global", id: null };
  if (value.startsWith(`${COMBO_TARGET}:`)) return { type: COMBO_TARGET, id: value.slice(COMBO_TARGET.length + 1) };
  if (value.startsWith(`${MODEL_TARGET}:`)) return { type: MODEL_TARGET, id: value.slice(MODEL_TARGET.length + 1) };
  return { type: "global", id: null };
}

export default function AITuningPageClient() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targetValue, setTargetValue] = useState(GLOBAL_TARGET);
  const [combos, setCombos] = useState([]);
  const [models, setModels] = useState([]);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const fileInputRef = useRef(null);

  const parsedTarget = useMemo(() => parseTargetValue(targetValue), [targetValue]);
  const isGlobal = parsedTarget.type === "global";
  const isPerTarget = !isGlobal;

  const preview = useMemo(() => buildPreview(form), [form]);
  const behaviorLength = form.behavior.trim().length;
  const promptLength = form.systemPrompt.trim().length;
  const estimatedTokens = Math.max(1, Math.round((form.systemPrompt.length + form.behavior.length) / 4));

  useEffect(() => {
    let mounted = true;
    async function loadTargets() {
      try {
        const [targetsRes, modelsRes] = await Promise.all([
          fetch("/api/tunings?action=targets", { cache: "no-store" }),
          fetch("/api/v1/models", { cache: "no-store" }),
        ]);
        if (!mounted) return;
        if (targetsRes.ok) {
          const t = await targetsRes.json();
          setCombos(t.combos || []);
        }
        if (modelsRes.ok) {
          const m = await modelsRes.json();
          const list = Array.isArray(m?.data) ? m.data : [];
          setModels(list.map((x) => ({ id: x.id, owner: x.owned_by })));
        }
      } catch (err) {
        console.error("load targets error", err);
      }
    }
    loadTargets();
    return () => { mounted = false; };
  }, []);

  const loadForTarget = async (value) => {
    const t = parseTargetValue(value);
    setLoadingTarget(true);
    try {
      if (t.type === "global") {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json();
        setForm({
          enabled: data?.aiTuningEnabled === true,
          name: data?.aiPersonaName || DEFAULT_FORM.name,
          tone: data?.aiPersonaTone || DEFAULT_FORM.tone,
          behavior: data?.aiPersonaBehavior || DEFAULT_FORM.behavior,
          systemPrompt: data?.aiSystemPrompt || DEFAULT_FORM.systemPrompt,
        });
      } else {
        const res = await fetch(`/api/tunings?targetType=${t.type}&targetId=${encodeURIComponent(t.id)}`, { cache: "no-store" });
        const data = await res.json();
        const row = Array.isArray(data?.tunings) ? data.tunings[0] : null;
        if (row) {
          setForm({
            enabled: row.enabled !== false,
            name: row.name || "",
            tone: row.tone || DEFAULT_FORM.tone,
            behavior: row.behavior || DEFAULT_FORM.behavior,
            systemPrompt: row.systemPrompt || DEFAULT_FORM.systemPrompt,
          });
        } else {
          setForm({ ...DEFAULT_FORM, enabled: true });
          toast.info("Belum ada tuning untuk target ini — mengisi default kosong.");
        }
      }
    } catch (error) {
      toast.error("Gagal load tuning: " + error.message);
    } finally {
      setLoadingTarget(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadForTarget(targetValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue]);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isGlobal) {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aiTuningEnabled: form.enabled,
            aiPersonaName: form.name,
            aiPersonaTone: form.tone,
            aiPersonaBehavior: form.behavior,
            aiSystemPrompt: form.systemPrompt,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Save failed");
        toast.success("Pengaturan global disimpan");
      } else {
        const res = await fetch("/api/tunings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: parsedTarget.type,
            targetId: parsedTarget.id,
            enabled: form.enabled,
            name: form.name,
            tone: form.tone,
            behavior: form.behavior,
            systemPrompt: form.systemPrompt,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Save failed");
        toast.success(`Tuning disimpan untuk ${parsedTarget.type} ${parsedTarget.id}`);
      }
    } catch (error) {
      toast.error(error.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => setForm(DEFAULT_FORM);

  const applyPreset = (preset) => {
    setForm((prev) => ({ ...prev, ...preset.values, enabled: true }));
    toast.success(`Preset applied: ${preset.label}`);
  };

  const appendSuggestion = (suggestion) => {
    setForm((prev) => ({
      ...prev,
      systemPrompt: prev.systemPrompt.includes(suggestion)
        ? prev.systemPrompt
        : `${prev.systemPrompt.trim()}\n- ${suggestion}`.trim(),
    }));
  };

  const handleExport = () => {
    try {
      const payload = { target: parsedTarget, ...form };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[.:]/g, "-");
      const slug = (form.name || "persona").toLowerCase().replace(/\s+/g, "-");
      anchor.href = url;
      anchor.download = `9router-${slug}-${stamp}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      toast.success("Persona exported");
    } catch (error) {
      toast.error("Export failed: " + error.message);
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setForm({
        enabled: parsed.enabled === true,
        name: parsed.name || DEFAULT_FORM.name,
        tone: parsed.tone || DEFAULT_FORM.tone,
        behavior: parsed.behavior || DEFAULT_FORM.behavior,
        systemPrompt: parsed.systemPrompt || DEFAULT_FORM.systemPrompt,
      });
      toast.success("Persona imported. Click 'Save tuning' to persist.");
    } catch (error) {
      toast.error("Import failed: " + error.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const targetOptions = useMemo(() => {
    const opts = [{ value: GLOBAL_TARGET, label: "🌐 Global default (semua request)" }];
    if (combos.length) {
      opts.push({ value: "__sep_combo__", label: "— Combo (virtual model) —", disabled: true });
      combos.forEach((c) => opts.push({
        value: `${COMBO_TARGET}:${c.id}`,
        label: `🧩 ${c.name} (${(c.models || []).length} model)`,
      }));
    }
    if (models.length) {
      opts.push({ value: "__sep_model__", label: "— Model —", disabled: true });
      models.slice(0, 200).forEach((m) => opts.push({
        value: `${MODEL_TARGET}:${m.id}`,
        label: `🤖 ${m.id} (${m.owner})`,
      }));
    }
    return opts;
  }, [combos, models]);

  const targetDescription = isGlobal
    ? "Tuning ini jadi fallback default untuk semua combo & model yg belum punya tuning sendiri."
    : `Tuning ini hanya berlaku untuk ${parsedTarget.type} ${parsedTarget.id} — override dari global. Panggil model ini lewat API dengan namanya, persona & system prompt akan ter-inject otomatis.`;

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <Toaster richColors />
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
          <span className="material-symbols-outlined text-[24px]">psychology</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">AI Tuning</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Tune nama, personality, behavior, system prompt per-target — global, combo, atau model.</p>
        </div>
      </div>

      <Card title="Target Selection" icon="target">
        <div className="space-y-3">
          <Select
            label="Tuning target"
            options={targetOptions}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
          />
          <p className="text-xs text-[var(--color-text-muted)]">{targetDescription}</p>
          {loadingTarget && <p className="text-xs text-[var(--color-text-muted)]">Loading…</p>}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card title="Persona Configuration" icon="tune">
            <div className="space-y-5">
              {initialLoading && (
                <div className="text-sm text-[var(--color-text-muted)]">Loading AI tuning settings...</div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-4">
                  <p className="text-xs text-[var(--color-text-muted)]">Status</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{form.enabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-4">
                  <p className="text-xs text-[var(--color-text-muted)]">Behavior chars</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{behaviorLength}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-4">
                  <p className="text-xs text-[var(--color-text-muted)]">Estimated prompt tokens</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">~{estimatedTokens}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-main)]">Enable tuning</p>
                  <p className="text-xs text-[var(--color-text-muted)]">When enabled, persona rules di-inject ke system prompt saat target ini dipanggil.</p>
                </div>
                <Toggle checked={form.enabled} onChange={(value) => updateField("enabled", value)} />
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-main)]">Quick presets</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Mulai dari persona yg sudah di-tune, lalu customize.</p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {presetOptions.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-4 text-left transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]"
                    >
                      <p className="text-sm font-semibold text-[var(--color-text-main)]">{preset.label}</p>
                      <p className="mt-1 text-xs text-[var(--color-text-muted)]">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Assistant name / Nama AI"
                type="text"
                placeholder="GPT 5.5, Zero 1.1, Kiro, dll"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                hint={isPerTarget ? `Nama ini yg akan di-inject sebagai identitas AI di system prompt.` : "Nama default untuk semua request."}
              />

              <Select
                label="Tone / Gaya bicara"
                options={toneOptions}
                value={form.tone}
                onChange={(e) => updateField("tone", e.target.value)}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[var(--color-text-main)]">Behavior / Perilaku</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{behaviorLength} chars</span>
                </div>
                <textarea
                  className="w-full min-h-28 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  placeholder="Helpful, direct, Indonesian-friendly, never too verbose..."
                  value={form.behavior}
                  onChange={(e) => updateField("behavior", e.target.value)}
                />
                <p className="text-xs text-[var(--color-text-muted)]">Sifat, aturan respons, batasan, gaya kerja AI.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-[var(--color-text-main)]">Custom system prompt</label>
                  <span className="text-xs text-[var(--color-text-muted)]">{promptLength} chars</span>
                </div>
                <textarea
                  className="w-full min-h-40 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                  placeholder="You are GPT 5.5..."
                  value={form.systemPrompt}
                  onChange={(e) => updateField("systemPrompt", e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {promptSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => appendSuggestion(suggestion)}
                      className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-text-main)] transition hover:border-[var(--color-accent)]/40 hover:text-[var(--color-accent)]"
                    >
                      + {suggestion}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {isPerTarget
                    ? `Disimpan khusus untuk target ini di tabel model_tunings. Backend akan merge dengan prompt user saat request masuk.`
                    : `Disimpan sebagai konfigurasi global di app settings.`}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="primary" onClick={handleSave} loading={saving || loadingTarget}>
                  Save tuning
                </Button>
                <Button variant="secondary" onClick={handleReset} disabled={saving || loadingTarget}>
                  Reset defaults
                </Button>
                <Button variant="outline" onClick={handleExport} disabled={loadingTarget}>
                  Export Persona
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loadingTarget}>
                  Import Persona
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleImport} accept=".json" className="hidden" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Persona Preview" icon="visibility">
            <div className="space-y-4">
              <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-4">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-hover,#0e7490)] flex items-center justify-center text-[var(--color-accent-fg)] font-semibold">
                    {(form.name || "AI").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-text-main)]">{form.name || "AI Assistant"}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {isGlobal ? "Global default" : `Targeted: ${parsedTarget.type} ${parsedTarget.id}`} · {form.enabled ? "Tuning aktif" : "Tuning nonaktif"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[var(--color-accent)]/20 bg-[var(--color-accent)]/5 p-4 text-xs text-[var(--color-text-main)]">
                <p className="font-semibold text-[var(--color-accent-fg)]">Preview summary</p>
                <ul className="mt-2 space-y-1 text-[var(--color-text-muted)]">
                  <li>• Tone: {form.tone}</li>
                  <li>• Behavior length: {behaviorLength} chars</li>
                  <li>• Prompt size estimate: ~{estimatedTokens} tokens</li>
                </ul>
              </div>

              <pre className="whitespace-pre-wrap rounded-xl border border-[var(--color-border-subtle)] bg-black/90 p-4 text-xs text-[var(--color-accent)] overflow-auto max-h-[420px]">
                {preview}
              </pre>

              <p className="text-xs text-[var(--color-text-muted)]">
                {isPerTarget
                  ? "Panggil combo / model ini lewat API dengan namanya, persona & system prompt akan otomatis ter-inject sebelum request diteruskan ke provider."
                  : "Halaman ini tune default persona. Tuning per-combo/per-model akan override nilai global."}
              </p>
            </div>
          </Card>

          <Card title="Cara kerja" icon="tips_and_updates" padding="sm">
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <p><span className="font-semibold text-[var(--color-text-main)]">1.</span> Bikin combo (mis. "gpt-5.5") dari beberapa model di <code className="font-mono text-[11px]">/dashboard/combos</code>.</p>
              <p><span className="font-semibold text-[var(--color-text-main)]">2.</span> Pilih target combo "gpt-5.5" di dropdown di atas.</p>
              <p><span className="font-semibold text-[var(--color-text-main)]">3.</span> Set nama, tone, behavior, system prompt → Save.</p>
              <p><span className="font-semibold text-[var(--color-text-main)]">4.</span> Panggil <code className="font-mono text-[11px]">POST /v1/chat/completions</code> body <code className="font-mono text-[11px]">"model": "gpt-5.5"</code> → tuning ter-inject.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
