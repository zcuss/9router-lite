"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Hexagon, Loader2, ArrowRight, KeyRound, User as UserIcon, Mail, Lock, AtSign } from "lucide-react";

const OAUTH_META = {
  google: { label: "Google", mark: "G" },
  github: { label: "GitHub", mark: "GH" },
  discord: { label: "Discord", mark: "D" },
};

const OAUTH_BTN_CLS = "h-10 w-full items-center justify-start gap-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-main)] transition-colors hover:bg-[var(--color-surface-2)]";

export default function LoginPage() {
  const [tab, setTab] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ oauth: [], magicLink: { enabled: false } });
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => c && setConfig(c))
      .catch(() => {});
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: tab === "register" ? "register" : "login",
          username: tab === "register" ? username : identifier,
          email: tab === "register" ? email : undefined,
          password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (tab === "register") {
          setTab("login");
          setInfo("Registration successful. Please sign in.");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        setError(data.error || "Authentication failed");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfo("Magic link sent. Check your inbox or spam folder.");
      } else {
        setError(data.error || "Failed to send magic link");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}/start`;
  };

  const enabledOauth = config.oauth.filter((p) => p.enabled);
  const tabs = [
    { id: "login", label: "Sign in" },
    { id: "register", label: "Sign up" },
    ...(config.magicLink?.enabled ? [{ id: "magic", label: "Magic Link" }] : []),
  ];

  const heading = {
    login: { title: "Welcome back", sub: "Sign in to manage your AI infrastructure." },
    register: { title: "Create your account", sub: "Register to get started with the dashboard." },
    magic: { title: "Sign in via email", sub: "We'll send a magic link to your inbox." },
  }[tab];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="flex flex-col justify-between border-b border-[var(--color-border)] p-8 lg:border-b-0 lg:border-r lg:p-12">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
              <Hexagon className="size-4.5" strokeWidth={2.25} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-[var(--color-text-main)]">
              Zcus Router
            </span>
            <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">
              Lite
            </span>
          </div>

          <div className="hidden flex-1 lg:flex lg:flex-col lg:justify-center">
            <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-[var(--color-text-main)]">
              One endpoint for every AI provider you use.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-text-muted)]">
              Manage API keys, monitor usage, route model combos, and handle Midtrans top-ups
              from a single lightweight dashboard.
            </p>
            <ul className="mt-8 space-y-2.5">
              {[
                "Multi-provider OAuth & magic link",
                "Midtrans top-up & automatic wallet",
                "Model combos with fallback routing",
                "Real-time usage & request logs",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--color-text-muted)]">
                  <span className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
            <span>Relay SaaS for AI</span>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-main)]">
                {heading.title}
              </h1>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{heading.sub}</p>
            </div>

            {tabs.length > 1 && (
              <div className="mb-5 flex w-full gap-0.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => { setTab(t.id); setError(""); setInfo(""); }}
                    className={`flex-1 min-w-0 rounded-[6px] px-3 py-1.5 text-xs font-medium transition-colors text-center ${
                      tab === t.id
                        ? "bg-[var(--color-text-main)] text-[var(--color-bg)]"
                        : "text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}

            {enabledOauth.length > 0 && (
              <div className="mb-5 space-y-2">
                {enabledOauth.map((p) => {
                  const meta = OAUTH_META[p.id] || { label: p.label, mark: p.id[0]?.toUpperCase() };
                  return (
                    <button key={p.id} type="button" onClick={() => handleOAuth(p.id)} className={OAUTH_BTN_CLS}>
                      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--color-surface-2)] text-[11px] font-bold text-[var(--color-text-muted)]">
                        {meta.mark}
                      </span>
                      <span className="flex-1 text-left">Continue with {meta.label}</span>
                    </button>
                  );
                })}
                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
                    or
                  </span>
                  <div className="h-px flex-1 bg-[var(--color-border)]" />
                </div>
              </div>
            )}

            {tab === "magic" ? (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus icon={Mail} />
                <Alert type="error" message={error} />
                <Alert type="info" message={info} />
                <button type="submit" disabled={loading} className="btn-base btn-primary w-full gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" strokeWidth={2} />}
                  <span>Send magic link</span>
                  {!loading && <ArrowRight className="size-4" strokeWidth={2} />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {tab === "register" ? (
                  <>
                    <Field label="Username" type="text" placeholder="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus icon={AtSign} />
                    <Field label="Email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required icon={Mail} />
                  </>
                ) : (
                  <Field label="Username or email" type="text" placeholder="username or email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required autoFocus icon={UserIcon} />
                )}
                <Field label="Password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required icon={Lock} />
                <Alert type="error" message={error} />
                <Alert type="info" message={info} />
                <button type="submit" disabled={loading} className="btn-base btn-primary w-full gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  <span>{tab === "register" ? "Create account" : "Sign in"}</span>
                  {!loading && <ArrowRight className="size-4" strokeWidth={2} />}
                </button>
              </form>
            )}

            <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
              © Zcus Router Lite
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, type = "text", placeholder, value, onChange, required, autoFocus, icon: Icon }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-[var(--color-text-muted)]">{label}</label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-subtle)]" strokeWidth={2} />
        )}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoFocus={autoFocus}
          className="input-base pl-9"
        />
      </div>
    </div>
  );
}

function Alert({ type, message }) {
  if (!message) return null;
  const styles = {
    error: "border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
    info: "border-[var(--color-info)]/30 bg-[var(--color-info)]/10 text-[var(--color-info)]",
    success: "border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]",
  };
  return <p className={`rounded-md border px-3 py-2 text-xs ${styles[type]}`}>{message}</p>;
}
