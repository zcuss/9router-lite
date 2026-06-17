"use client";

import { useState, useEffect } from "react";
import { Card, Button, Input } from "@/shared/components";
import { useRouter } from "next/navigation";

const OAUTH_COLORS = {
  google: { bg: "bg-white hover:bg-gray-50 text-gray-800 border border-gray-200", logo: "G" },
  github: { bg: "bg-[#24292e] hover:bg-[#1b1f23] text-white border border-[#24292e]", logo: "GH" },
  discord: { bg: "bg-[#5865F2] hover:bg-[#4752c4] text-white border border-[#5865F2]", logo: "D" },
};

export default function LoginPage() {
  const [tab, setTab] = useState("login"); // "login" | "register" | "magic"
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
          setInfo("Pendaftaran berhasil! Silakan login.");
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
        setInfo("Tautan login telah dikirim ke email Anda. Silakan cek inbox/spam.");
      } else {
        setError(data.error || "Gagal mengirim magic link");
      }
    } catch (err) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider) => {
    window.location.href = `/api/auth/oauth/${provider}/start`;
  };

  const enabledOauth = config.oauth.filter((p) => p.enabled);
  const tabs = [
    { id: "login", label: "Masuk" },
    { id: "register", label: "Daftar" },
    ...(config.magicLink?.enabled ? [{ id: "magic", label: "Magic Link" }] : []),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4 relative overflow-hidden">
      <div className="landing-grid absolute inset-0 pointer-events-none" aria-hidden="true" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Zcus Router</h1>
          <p className="text-text-muted">
            {tab === "register"
              ? "Buat akun untuk mulai kelola infrastruktur AI Anda"
              : tab === "magic"
              ? "Masuk instan lewat tautan ke email Anda"
              : "Masuk untuk kelola infrastruktur AI Anda"}
          </p>
        </div>

        <Card>
          {enabledOauth.length > 0 && (
            <div className="flex flex-col gap-2 mb-5">
              {enabledOauth.map((p) => {
                const style = OAUTH_COLORS[p.id] || { bg: "bg-surface-2 hover:bg-surface-2/80 text-text-main border border-border-subtle", logo: p.id[0]?.toUpperCase() };
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleOAuth(p.id)}
                    className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${style.bg}`}
                  >
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/10 text-[11px] font-bold">
                      {style.logo}
                    </span>
                    Lanjut dengan {p.label}
                  </button>
                );
              })}
            </div>
          )}

          {enabledOauth.length > 0 && (
            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-wider text-text-subtle">
              <div className="h-px flex-1 bg-border-subtle" />
              <span>atau</span>
              <div className="h-px flex-1 bg-border-subtle" />
            </div>
          )}

          {tabs.length > 1 && (
            <div className="flex gap-1 rounded-lg bg-surface-2 p-1 mb-4">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTab(t.id);
                    setError("");
                    setInfo("");
                  }}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                    tab === t.id
                      ? "bg-bg text-text-main shadow-sm"
                      : "text-text-muted hover:text-text-main"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {tab === "magic" ? (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">Email</label>
                <Input
                  type="email"
                  placeholder="kamu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {info && <p className="text-xs text-green-500">{info}</p>}
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                Kirim Tautan Login
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
              {tab === "register" ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-main">Nama Pengguna</label>
                    <Input
                      type="text"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
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
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-text-main">Nama Pengguna atau Email</label>
                  <Input
                    type="text"
                    placeholder="username atau email"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-main">Kata Sandi</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              {info && <p className="text-xs text-green-500">{info}</p>}
              <Button type="submit" variant="primary" className="w-full" loading={loading}>
                {tab === "register" ? "Daftar" : "Masuk"}
              </Button>
            </form>
          )}
        </Card>
        <p className="text-center text-[11px] text-text-subtle mt-6">
          Zcus Router Lite — Relay SaaS AI Anda
        </p>
      </div>
    </div>
  );
}
