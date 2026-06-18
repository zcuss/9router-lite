"use client";

export const dynamic = "force-dynamic";
import { useEffect, useRef, useState } from "react";
import { Send, KeyRound, Loader2, AlertCircle, ExternalLink, Trash2, Copy, Check, Bot, User } from "lucide-react";
import { Card } from "@/shared/components";

const fmt = (n) => (n == null ? "—" : new Intl.NumberFormat().format(Math.round(n)));

export default function ChatPage() {
  const [keys, setKeys] = useState([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [selectedKeyId, setSelectedKeyId] = useState(null);
  const [endpoint, setEndpoint] = useState("");
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [model, setModel] = useState("");
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [tokens, setTokens] = useState({ prompt: 0, completion: 0, total: 0 });
  const [copiedIdx, setCopiedIdx] = useState(null);
  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  // Load user's own API keys from /api/keys
  useEffect(() => {
    setKeysLoading(true);
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list = (d?.keys || []).filter((k) => k.isActive);
        setKeys(list);
        if (list[0]?.id) setSelectedKeyId(list[0].id);
      })
      .catch(() => {})
      .finally(() => setKeysLoading(false));
  }, []);

  // Set default endpoint to current origin + /v1 (user's own router endpoint)
  useEffect(() => {
    if (typeof window !== "undefined" && !endpoint) {
      setEndpoint(`${window.location.origin}/v1`);
    }
  }, [endpoint]);

  // Load available models from the chosen endpoint
  const loadModels = async (ep) => {
    const target = ep || endpoint;
    if (!target) return;
    setModelsLoading(true);
    try {
      const res = await fetch(`${target.replace(/\/$/, "")}/models`);
      if (res.ok) {
        const data = await res.json();
        const list = (data?.data || []).map((m) => m.id).filter(Boolean);
        setModels(list);
        if (list[0] && !model) setModel(list[0]);
      } else {
        setModels([]);
      }
    } catch {
      setModels([]);
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => {
    if (endpoint) loadModels(endpoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedKey = keys.find((k) => k.id === selectedKeyId);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (!endpoint) { setError("Endpoint required"); return; }
    if (!model) { setError("Model required (refresh model list first)"); return; }
    if (!selectedKey) { setError("No API key selected — create one in Endpoint & Kunci API"); return; }

    const userMsg = { role: "user", content: text, ts: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft("");
    setError(null);
    setSending(true);
    setTokens({ prompt: 0, completion: 0, total: 0 });

    const assistantMsg = { role: "assistant", content: "", ts: Date.now() };
    setMessages([...next, assistantMsg]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch(`${endpoint.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${selectedKey.key}`,
        },
        body: JSON.stringify({
          model,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const ln of lines) {
          const t = ln.trim();
          if (!t || !t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const obj = JSON.parse(data);
            const delta = obj?.choices?.[0]?.delta?.content || obj?.choices?.[0]?.message?.content || "";
            if (delta) {
              acc += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: acc };
                return copy;
              });
            }
            const u = obj?.usage;
            if (u) {
              setTokens({
                prompt: u.prompt_tokens || 0,
                completion: u.completion_tokens || 0,
                total: u.total_tokens || 0,
              });
            }
          } catch {}
        }
      }
    } catch (e) {
      if (e.name !== "AbortError") {
        setError(e.message || "Request failed");
        setMessages((m) => m.slice(0, -1));
      }
    } finally {
      setSending(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();
  const clearChat = () => { setMessages([]); setTokens({ prompt: 0, completion: 0, total: 0 }); setError(null); };
  const copyMsg = async (i, text) => { await navigator.clipboard.writeText(text || ""); setCopiedIdx(i); setTimeout(() => setCopiedIdx(null), 1500); };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-4">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">Chat</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1 flex items-center gap-2">
            <Bot className="size-6 text-[var(--color-accent)]" />
            Chat Playground
          </h1>
          <p className="text-[12px] text-[var(--color-text-muted)] mt-1">
            Talk to your own router endpoint using your own API key.
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          disabled={messages.length === 0}
          className="h-8 px-3 rounded-md border border-[var(--color-border-subtle)] text-[11px] font-medium hover:border-[var(--color-text-main)] flex items-center gap-1.5 disabled:opacity-40"
        >
          <Trash2 size={12} /> Clear
        </button>
      </header>

      <Card padding="md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">Endpoint</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              onBlur={() => endpoint && loadModels(endpoint)}
              placeholder="https://your-router.example/v1"
              className="w-full h-9 px-3 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[12px] font-mono outline-none focus:border-[var(--color-text-main)]"
            />
            <p className="text-[10px] text-[var(--color-text-subtle)] mt-1 font-mono break-all">
              GET {endpoint || "..."}/models <ExternalLink className="inline size-2.5" />
            </p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5">Model</label>
            <div className="flex gap-1.5">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                disabled={modelsLoading || models.length === 0}
                className="flex-1 min-w-0 h-9 px-2 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[12px] outline-none focus:border-[var(--color-text-main)]"
              >
                {modelsLoading ? (
                  <option>Loading…</option>
                ) : models.length === 0 ? (
                  <option value="">{endpoint ? "(none)" : "—"}</option>
                ) : (
                  models.map((m) => <option key={m} value={m}>{m}</option>)
                )}
              </select>
              <button
                type="button"
                onClick={() => loadModels()}
                disabled={!endpoint || modelsLoading}
                className="h-9 w-9 rounded-md border border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] flex items-center justify-center disabled:opacity-40"
                title="Refresh model list"
              >
                <Loader2 size={12} className={modelsLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium block mb-1.5 flex items-center gap-1.5">
              <KeyRound size={10} /> Your API key
            </label>
            {keysLoading ? (
              <div className="h-9 px-3 rounded-md border border-[var(--color-border-subtle)] flex items-center text-[12px] text-[var(--color-text-muted)]">
                Loading…
              </div>
            ) : keys.length === 0 ? (
              <a
                href="/dashboard/endpoint"
                className="h-9 px-3 rounded-md border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 text-[12px] flex items-center justify-between hover:bg-[var(--color-accent)]/15"
              >
                <span>No active keys. Create one.</span>
                <ExternalLink size={12} />
              </a>
            ) : (
              <select
                value={selectedKeyId || ""}
                onChange={(e) => setSelectedKeyId(e.target.value)}
                className="w-full h-9 px-2 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[12px] outline-none focus:border-[var(--color-text-main)]"
              >
                {keys.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.name} ({k.key.slice(0, 8)}…{k.key.slice(-4)})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="text-[10px] text-[var(--color-text-subtle)] flex items-end">
            {selectedKey && (
              <span className="font-mono">
                using key ending …{selectedKey.key.slice(-4)} · created {new Date(selectedKey.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-3 py-2 text-[12px] text-[var(--color-danger)] flex items-center gap-2">
          <AlertCircle size={12} /> {error}
        </div>
      )}

      <div
        ref={scrollRef}
        className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] min-h-[360px] max-h-[60vh] overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-2 text-[var(--color-text-subtle)]">
            <Bot className="size-8 opacity-40" />
            <div className="text-[12px]">Send a message to start the conversation.</div>
            <div className="text-[10px] font-mono">POST {endpoint || "..."}/chat/completions · model={model || "—"}</div>
          </div>
        ) : messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`shrink-0 size-7 rounded-md grid place-items-center text-[10px] ${
              m.role === "user"
                ? "bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                : "bg-[var(--color-surface-2)] text-[var(--color-text-muted)]"
            }`}>
              {m.role === "user" ? <User size={12} /> : <Bot size={12} />}
            </div>
            <div className={`min-w-0 max-w-[80%] rounded-lg p-3 text-[12px] leading-relaxed whitespace-pre-wrap break-words ${
              m.role === "user"
                ? "bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20"
                : "bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]"
            }`}>
              {m.content || (m.role === "assistant" && sending ? <Loader2 size={12} className="animate-spin inline" /> : "")}
            </div>
            {m.role === "assistant" && m.content && (
              <button
                type="button"
                onClick={() => copyMsg(i, m.content)}
                className="shrink-0 self-start h-6 w-6 rounded text-[var(--color-text-subtle)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] flex items-center justify-center"
                title="Copy"
              >
                {copiedIdx === i ? <Check size={11} /> : <Copy size={11} />}
              </button>
            )}
          </div>
        ))}
      </div>

      <Card padding="sm">
        <div className="flex gap-2 items-end">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!sending) send();
              }
            }}
            rows={3}
            disabled={sending || !selectedKey}
            placeholder={selectedKey ? "Type a message...  (Enter to send · Shift+Enter for newline)" : "Select or create an API key first"}
            className="flex-1 px-3 py-2 rounded-md border border-[var(--color-border-subtle)] bg-transparent text-[13px] outline-none focus:border-[var(--color-text-main)] resize-none disabled:opacity-50"
          />
          {sending ? (
            <button
              type="button"
              onClick={stop}
              className="h-10 px-4 rounded-md border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-[12px] font-medium hover:bg-[var(--color-danger)]/10"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim() || !selectedKey || !model}
              className="h-10 px-4 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Send size={13} /> Send
            </button>
          )}
        </div>
        {tokens.total > 0 && (
          <div className="mt-2 text-[10px] font-mono text-[var(--color-text-subtle)] flex items-center gap-3">
            <span>prompt: {fmt(tokens.prompt)}</span>
            <span>completion: {fmt(tokens.completion)}</span>
            <span>total: {fmt(tokens.total)}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
