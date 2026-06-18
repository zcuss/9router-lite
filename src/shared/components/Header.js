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
  if (pathname.includes("/providers") && !pathname.includes("/media-providers")) return { title: "Providers", description: "Manage your AI provider connections" };
  if (pathname.includes("/combos")) return { title: "Model Combos", description: "Build combos with automatic fallback routing" };
  if (pathname.includes("/usage")) return { title: "Usage", description: "Monitor API usage, tokens, and request logs" };
  if (pathname.includes("/quota")) return { title: "API Keys & Quota", description: "Manage your API keys and quota limits" };
  if (pathname.includes("/ai-tuning")) return { title: "AI Tuning", description: "Tune assistant name, personality, and system prompt" };
  if (pathname.includes("/mitm")) return { title: "MITM Proxy", description: "Intercept CLI tool traffic through the proxy" };
  if (pathname.includes("/cli-tools")) return { title: "CLI Tools", description: "Configure CLI tools" };
  if (pathname.includes("/proxy-pools")) return { title: "Proxy Pools", description: "Manage your proxy pool configurations" };
  if (pathname.includes("/skills")) return { title: "Skills", description: "Copy a link and paste it into your AI assistant" };
  if (pathname.includes("/endpoint")) return { title: "Endpoint & API Keys", description: "API endpoint and key management" };
  if (pathname.includes("/profile")) return { title: "Account", description: "Manage your preferences" };
  if (pathname.includes("/translator")) return { title: "Translator", description: "Debug translation between formats" };
  if (pathname.includes("/console-log")) return { title: "Console", description: "Live server console output" };
  if (pathname.includes("/topup")) return { title: "Top Up", description: "Add balance to your account" };
  if (pathname.includes("/vouchers")) return { title: "Vouchers", description: "Redeem voucher and manage balance" };
  if (pathname.includes("/admin/models")) return { title: "Model Releases", description: "Publish models available to users" };
  if (pathname.includes("/admin/vouchers")) return { title: "Vouchers & Top Up", description: "Manage vouchers and approve pending payments" };
  if (pathname.includes("/user-management")) return { title: "User Management", description: "Manage users and roles" };
  if (pathname.includes("/pricing")) return { title: "Pricing & Plans", description: "Subscription plans and pricing" };
  if (pathname.includes("/settings/database")) return { title: "Database", description: "Database configuration" };
  if (pathname === "/dashboard") return { title: "Home", description: "Overview of your AI infrastructure" };
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
