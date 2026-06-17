"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input } from "@/shared/components";
import { useRouter } from "next/navigation";

const OAuthButton = ({ provider, label, icon, color, onClick, loading, disabled }) => (
  <button
    type="button"
    onClick={() => onClick?.(provider)}
    disabled={loading || disabled}
    className="flex items-center justify-center gap-3 w-full rounded-xl border border-border-subtle bg-surface-2/60 hover:bg-surface-2/90 px-4 py-2.5 text-sm font-medium text-text-main transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    style={{ borderLeft: `3px solid ${color}` }}
  >
    <span
      className="inline-flex items-center justify-center size-5 rounded-md text-white text-[11px] font-bold"
      style={{ backgroundColor: color }}
    >
      {icon}
    </span>
    <span>Lanjut dengan {label}</span>
  </button>
);

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register" | "magic"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [providers, setProviders] = useState([]);
  const [requireLogin, setRequireLogin] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/config")
      .then(r => r.json())
      .then(data => {
        if (!mounted) return;
        if (Array.isArray(data?.providers)) setProviders(data.providers);
        if (typeof data?.requireLogin === "boolean") setRequireLogin(data.requireLogin);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "magic") {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: magicEmail }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setSuccess("Tautan login telah dikirim ke email kamu. Cek inbox/spam kamu.");
        } else {
          setError(data.error || "Gagal mengirim magic link");
        }
        return;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === "register" ? "register" : "login",
          username,
          password,
          email: mode === "register" ? email : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (mode === "register") {
          setMode("login");
          setSuccess("Registrasi berhasil! Silakan login dengan akun baru kamu.");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        setError(data.error || "Autentikasi gagal");
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (providerId) => {
    setOauthLoading(providerId);
    setError("");
    try {
      const res = await fetch(`/api/auth/oauth/${providerId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnTo: "/dashboard" }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || `Login ${providerId} belum dikonfigurasi`);
        setOauthLoading(null);
      }
    } catch (err) {
      setError("Gagal memulai OAuth");
      setOauthLoading(null);
    }
  };

  const tabs = [
    { id: "login", label: "Login" },
    { id: "register", label: "Daftar" },
    { id: "magic", label: "Magic Link" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">9Router</h1>
          <p className="text-text-muted">
            {mode === "register"
              ? "Buat akun untuk mulai"
              : mode === "magic"
              ? "Kirim tautan login ke email kamu"
              : "Masuk untuk mengelola infrastruktur AI kamu"}
          </p>
        </div>

        <Card>
          {/* Tabs */}
          <div className="flex gap-1 p-1 mb-5 bg-surface-2/40 rounded-xl">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setMode(t.id); setError(""); setSuccess(""); }}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  mode === t.id
                    ? "bg-brand-500/15 text-brand-600 dark:text-brand-300"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* OAuth Buttons */}
          {providers.length > 0 && mode !== "magic" && (
            <div className="flex flex-col gap-2 mb-5">
              {providers.map((p) => (
                <OAuthButton
                  key={p.id}
                  provider={p.id}
                  label={p.label}
                  icon={p.label[0]}
                  color={p.color}
                  onClick={handleOAuth}
                  loading={oauthLoading === p.id}
                  disabled={!!oauthLoading}
                />
              ))}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-[10px] text-text-muted uppercase tracking-widest">atau</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "magic" ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">Email</label>
                <Input
                  type="email"
                  placeholder="kamu@email.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  required
                  autoFocus
                />
                <p className="text-[11px] text-text-muted">
                  Kami akan mengirim tautan login sekali pakai ke email kamu.
                </p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-main">
                    {mode === "register" ? "Username" : "Username atau Email"}
                  </label>
                  <Input
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {mode === "register" && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-main">Email</label>
                    <Input
                      type="email"
                      placeholder="kamu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-main">Password</label>
                  <Input
                    type="password"
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>
            )}
            {success && (
              <p className="text-xs text-green-500 bg-green-500/10 px-3 py-2 rounded-lg">{success}</p>
            )}

            <Button type="submit" variant="primary" className="w-full" loading={loading}>
              {mode === "register" ? "Daftar" : mode === "magic" ? "Kirim Tautan Login" : "Login"}
            </Button>
          </form>
        </Card>

        <p className="text-center text-[11px] text-text-muted mt-4">
          {requireLogin
            ? "Login dibutuhkan untuk mengakses dashboard"
            : "Kamu bisa masuk tanpa login dan mencoba fitur publik"}
        </p>
      </div>
    </div>
  );
}
