"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import PropTypes from "prop-types";
import { Menu, Search, X, LogOut, User, ChevronRight, Zap, Brain, Heart } from "lucide-react";
import HeaderMenu from "@/shared/components/HeaderMenu";
import ThemeToggle from "@/shared/components/ThemeToggle";
import ViewAsSwitcher from "@/shared/components/ViewAsSwitcher";
import useSettingsStore from "@/store/settingsStore";
import { translate } from "@/i18n/runtime";
import { useHeaderSearchStore } from "@/store/headerSearchStore";

const getPageInfo = (pathname) => {
  if (!pathname) return { title: "", description: "" };
  if (pathname.includes("/providers") && !pathname.includes("/media-providers")) return { title: "Provider", description: "Kelola koneksi provider AI Anda" };
  if (pathname.includes("/combos")) return { title: "Kombo Model", description: "Bangun kombo dengan routing fallback otomatis" };
  if (pathname.includes("/usage")) return { title: "Pemakaian", description: "Pantau pemakaian API, token, dan log permintaan" };
  if (pathname.includes("/quota")) return { title: "Kunci API & Kuota", description: "Kelola kunci API dan batas kuota Anda" };
  if (pathname.includes("/ai-tuning")) return { title: "Tuning AI", description: "Atur nama, kepribadian, dan system prompt asisten" };
  if (pathname.includes("/mitm")) return { title: "MITM Proxy", description: "Intersept traffic alat CLI melalui proxy" };
  if (pathname.includes("/cli-tools")) return { title: "Alat CLI", description: "Konfigurasi alat CLI" };
  if (pathname.includes("/proxy-pools")) return { title: "Proxy Pool", description: "Kelola konfigurasi proxy pool Anda" };
  if (pathname.includes("/skills")) return { title: "Skills", description: "Salin link dan tempel ke asisten AI Anda" };
  if (pathname.includes("/endpoint")) return { title: "Endpoint & Kunci API", description: "Konfigurasi endpoint API Anda" };
  if (pathname.includes("/profile")) return { title: "Akun", description: "Kelola preferensi Anda" };
  if (pathname.includes("/translator")) return { title: "Translator", description: "Debug translasi antar format" };
  if (pathname.includes("/console-log")) return { title: "Console", description: "Output console server langsung" };
  if (pathname.includes("/topup")) return { title: "Top Up", description: "Isi ulang saldo Anda" };
  if (pathname.includes("/vouchers")) return { title: "Voucher", description: "Tukar voucher dan kelola saldo" };
  if (pathname.includes("/admin/models")) return { title: "Rilis Model", description: "Publikasi model yang tersedia untuk user" };
  if (pathname.includes("/admin/vouchers")) return { title: "Voucher & Top Up", description: "Kelola voucher dan approve top up user" };
  if (pathname.includes("/user-management")) return { title: "Manajemen User", description: "Kelola user dan role" };
  if (pathname.includes("/pricing")) return { title: "Harga & Paket", description: "Paket langganan dan harga" };
  if (pathname.includes("/settings/database")) return { title: "Database", description: "Konfigurasi database" };
  if (pathname === "/dashboard") return { title: "Beranda", description: "Ringkasan infrastruktur AI Anda" };
  return { title: "", description: "" };
};

export default function Header({ onMenuClick, showMenuButton = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const { settings, fetchSettings, patchSettings } = useSettingsStore();
  const uiMode = settings?.uiMode || "expert";
  const pageInfo = useMemo(() => getPageInfo(pathname), [pathname]);
  const { title, description } = pageInfo;

  useEffect(() => { fetchSettings(); }, []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/status", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setDisplayName(data?.displayName || data?.oidcName || data?.oidcEmail || "");
          setLoginMethod(data?.loginMethod || "");
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        router.push("/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-4 lg:px-8">
      <div className="flex items-center gap-3 lg:hidden">
        {showMenuButton && (
          <button
            onClick={onMenuClick}
            className="grid size-9 place-items-center rounded-md border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-main)]"
            aria-label="Open menu"
          >
            <Menu className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {title ? (
          <div>
            <h1 className="truncate text-base font-semibold tracking-tight text-[var(--color-text-main)] lg:text-lg">
              {translate(title)}
            </h1>
            {description && (
              <p className="hidden truncate text-xs text-[var(--color-text-muted)] lg:block">
                {translate(description)}
              </p>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {displayName && loginMethod === "OIDC" && (
          <div className="hidden items-center gap-1.5 truncate rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-muted)] sm:flex max-w-[200px]">
            <User className="size-3.5 shrink-0" strokeWidth={2} />
            <span className="truncate">{displayName}</span>
            <span className="ml-1 rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              OIDC
            </span>
          </div>
        )}
        <HeaderSearch />
        <ViewAsSwitcher />
        <button
          type="button"
          onClick={async () => {
            const nextMode = uiMode === "expert" ? "lite" : "expert";
            await patchSettings({ uiMode: nextMode });
            await fetchSettings();
          }}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors ${
            uiMode === "expert"
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-text-subtle)] hover:text-[var(--color-text-main)]"
          }`}
          title={`Switch to ${uiMode === "expert" ? "Lite" : "Expert"} mode`}
        >
          {uiMode === "expert" ? <Brain className="size-3.5" strokeWidth={2} /> : <Zap className="size-3.5" strokeWidth={2} />}
          <span className="hidden capitalize sm:inline">{uiMode}</span>
        </button>
        <button
          onClick={() => alert("Thanks for the support!")}
          className="hidden h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text-subtle)] hover:text-[var(--color-text-main)] sm:inline-flex"
          aria-label="Donate"
        >
          <Heart className="size-3.5" strokeWidth={2} />
          <span>Donate</span>
        </button>
        <ThemeToggle />
        <HeaderMenu onLogout={handleLogout} />
      </div>
    </header>
  );
}

function HeaderSearch() {
  const visible = useHeaderSearchStore((s) => s.visible);
  const query = useHeaderSearchStore((s) => s.query);
  const placeholder = useHeaderSearchStore((s) => s.placeholder);
  const setQuery = useHeaderSearchStore((s) => s.setQuery);
  if (!visible) return null;
  return (
    <div className="relative w-[160px] sm:w-[240px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--color-text-subtle)]" strokeWidth={2} />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || "Search..."}
        className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] pl-8 pr-8 text-sm text-[var(--color-text-main)] placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30"
      />
      {query && (
        <button
          type="button"
          onClick={() => setQuery("")}
          className="absolute right-2 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded text-[var(--color-text-subtle)] hover:text-[var(--color-text-main)]"
          aria-label="Clear search"
        >
          <X className="size-3" strokeWidth={2.25} />
        </button>
      )}
    </div>
  );
}

Header.propTypes = { onMenuClick: PropTypes.func, showMenuButton: PropTypes.bool };
