"use client";

import { useEffect, useState } from "react";
import { KeyRound, Copy, Check, Plus, Trash2, Eye, EyeOff, Link2, ChevronRight } from "lucide-react";

const endpointUrl = typeof window !== "undefined" ? `${window.location.origin}/v1` : "/v1";

export default function UserEndpointPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [copied, setCopied] = useState("");
  const [revealed, setRevealed] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/keys");
      const data = await res.json();
      setKeys(data.keys || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const copyText = async (text, id) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(""), 1200);
  };

  const createKey = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setKeys((prev) => [data.key, ...prev]);
        setRevealed(data.key.id);
        setShowCreate(false);
        setNewName("");
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteKey = async (id) => {
    if (!confirm("Delete this API key?")) return;
    await fetch(`/api/keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--color-text-subtle)]">Access</div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">Endpoint & keys</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[12px] font-medium flex items-center gap-2"
        >
          <Plus size={13} /> New key
        </button>
      </header>

      <section className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={14} className="text-[var(--color-text-subtle)]" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">Base endpoint</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="flex-1 min-w-[260px] rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-[12px] font-mono text-[var(--color-text-main)] overflow-x-auto">
            {endpointUrl}
          </code>
          <button
            onClick={() => copyText(endpointUrl, "endpoint")}
            className="h-9 px-3 rounded-md border border-[var(--color-border-subtle)] text-[12px] font-medium hover:border-[var(--color-text-main)] flex items-center gap-2"
          >
            {copied === "endpoint" ? <Check size={13} className="text-success" /> : <Copy size={13} />}
            Copy
          </button>
        </div>
        <div className="mt-3 text-[11px] text-[var(--color-text-subtle)]">
          Use this with your OpenAI-compatible client. Generate a key below, then point your SDK here.
        </div>
      </section>

      <section className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <h2 className="text-[14px] font-semibold">API keys</h2>
          <span className="text-[11px] text-[var(--color-text-subtle)]">{keys.length} total</span>
        </div>

        {showCreate && (
          <div className="px-5 py-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createKey()}
              placeholder="Key name"
              className="flex-1 h-9 px-3 rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface)] text-[12px] outline-none focus:border-[var(--color-text-main)]"
            />
            <button
              onClick={createKey}
              disabled={creating || !newName.trim()}
              className="h-9 px-4 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[12px] font-medium disabled:opacity-40"
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        )}

        {loading ? (
          <div className="px-5 py-12 text-center text-[12px] text-[var(--color-text-subtle)]">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-[12px] text-[var(--color-text-subtle)]">No keys yet.</div>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 h-8 px-3 rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[11px] font-medium inline-flex items-center gap-1.5"
            >
              <Plus size={12} /> Create your first key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border-subtle)]">
            {keys.map((key) => {
              const raw = key.key || key.apiKey || "";
              const masked = raw ? `${raw.slice(0, 8)}••••${raw.slice(-4)}` : `••••••••${key.lastFour || ""}`;
              const visible = revealed === key.id;
              return (
                <div key={key.id} className="px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-[var(--color-surface-2)] flex items-center justify-center shrink-0">
                    <KeyRound size={14} strokeWidth={1.6} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium truncate">{key.name || "Unnamed"}</div>
                    <div className="text-[10px] text-[var(--color-text-subtle)] font-mono truncate">{visible ? raw : masked}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setRevealed(visible ? "" : key.id)}
                      className="h-7 w-7 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] flex items-center justify-center"
                    >
                      {visible ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={() => copyText(raw, key.id)}
                      className="h-7 w-7 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] flex items-center justify-center"
                    >
                      {copied === key.id ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                    </button>
                    <button
                      onClick={() => deleteKey(key.id)}
                      className="h-7 w-7 rounded text-[var(--color-text-muted)] hover:text-danger hover:bg-[var(--color-surface-2)] flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface)] p-5">
        <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium mb-3">Quick start</div>
        <div className="rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-4 overflow-x-auto">
          <pre className="text-[11px] font-mono leading-6 text-[var(--color-text-main)] whitespace-pre-wrap">{`from openai import OpenAI

client = OpenAI(
  api_key="YOUR_KEY",
  base_url="${endpointUrl}"
)

resp = client.chat.completions.create(
  model="openai/gpt-4o-mini",
  messages=[{"role": "user", "content": "hello"}]
)

print(resp.choices[0].message.content)`}</pre>
        </div>
      </section>
    </div>
  );
}
