"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import PropTypes from "prop-types";
import ProviderIcon from "@/shared/components/ProviderIcon";
import HeaderMenu from "@/shared/components/HeaderMenu";
import ThemeToggle from "@/shared/components/ThemeToggle";
import DonateModal from "@/shared/components/DonateModal";
import ViewAsSwitcher from "@/shared/components/ViewAsSwitcher";
import { useHeaderSearchStore } from "@/store/headerSearchStore";
import useSettingsStore from "@/store/settingsStore";
import { OAUTH_PROVIDERS, APIKEY_PROVIDERS } from "@/shared/constants/config";
import { MEDIA_PROVIDER_KINDS, AI_PROVIDERS } from "@/shared/constants/providers";
import { translate } from "@/i18n/runtime";

const getPageInfo = (pathname) => {
  if (!pathname) return { title: "", description: "", breadcrumbs: [] };
  const mediaDetailMatch = pathname.match(/\/media-providers\/([^/]+)\/([^/]+)$/);
  if (mediaDetailMatch) {
    const kindId = mediaDetailMatch[1];
    const providerId = mediaDetailMatch[2];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    const provider = AI_PROVIDERS[providerId];
    return {
      title: provider?.name || providerId,
      description: "",
      breadcrumbs: [
        { label: "Media Providers", href: `/dashboard/media-providers/${kindId}` },
        { label: kindConfig?.label || kindId, href: `/dashboard/media-providers/${kindId}` },
        { label: provider?.name || providerId, image: `/providers/${providerId}.png` },
      ],
    };
  }
  const mediaKindMatch = pathname.match(/\/media-providers\/([^/]+)$/);
  if (mediaKindMatch) {
    const kindId = mediaKindMatch[1];
    const kindConfig = MEDIA_PROVIDER_KINDS.find((k) => k.id === kindId);
    return { title: kindConfig?.label || kindId, description: `Manage your ${kindConfig?.label || kindId} providers`, icon: kindConfig?.icon || "perm_media", breadcrumbs: [] };
  }
  const providerMatch = pathname.match(/\/providers\/([^/]+)$/);
  if (providerMatch) {
    const providerId = providerMatch[1];
    const providerInfo = OAUTH_PROVIDERS[providerId] || APIKEY_PROVIDERS[providerId];
    if (providerInfo) return { title: providerInfo.name, description: "", breadcrumbs: [{ label: "Providers", href: "/dashboard/providers" }, { label: providerInfo.name, image: `/providers/${providerInfo.id}.png` }] };
  }
  if (pathname.includes("/providers") && !pathname.includes("/media-providers")) return { title: "Providers", description: "Manage your AI provider connections", icon: "dns", breadcrumbs: [] };
  if (pathname.includes("/combos")) return { title: "Combos", description: "Model combos with fallback", icon: "layers", breadcrumbs: [] };
  if (pathname.includes("/usage")) return { title: "Usage & Analytics", description: "Monitor your API usage, token consumption, and request logs", icon: "bar_chart", breadcrumbs: [] };
  if (pathname.includes("/auth-files")) return { title: "Auth Files", description: "Map provider credentials stored in the local database", icon: "vpn_key", breadcrumbs: [] };
  if (pathname.includes("/quota")) return { title: "Quota Tracker", description: "Track and manage your API quota limits", icon: "data_usage", breadcrumbs: [] };
  if (pathname.includes("/ai-tuning")) return { title: "AI Tuning", description: "Tune assistant name, personality, behavior, and system prompt", icon: "psychology", breadcrumbs: [] };
  if (pathname.includes("/mitm")) return { title: "MITM Proxy", description: "Intercept CLI tool traffic and route through 9Router", icon: "security", breadcrumbs: [] };
  if (pathname.includes("/cli-tools")) return { title: "CLI Tools", description: "Configure CLI tools", icon: "terminal", breadcrumbs: [] };
  if (pathname.includes("/proxy-pools")) return { title: "Proxy Pools", description: "Manage your proxy pool configurations", icon: "lan", breadcrumbs: [] };
  if (pathname.includes("/skills")) return { title: "Agent Skills", description: "Copy a link and paste to your AI to use 9Router — no install needed", icon: "extension", breadcrumbs: [] };
  if (pathname.includes("/endpoint")) return { title: "Endpoint", description: "API endpoint configuration", icon: "api", breadcrumbs: [] };
  if (pathname.includes("/profile")) return { title: "Settings", description: "Manage your preferences", icon: "settings", breadcrumbs: [] };
  if (pathname.includes("/translator")) return { title: "Translator", description: "Debug translation flow between formats", icon: "translate", breadcrumbs: [] };
  if (pathname.includes("/console-log")) return { title: "Console Log", description: "Live server console output", icon: "monitor", breadcrumbs: [] };
  if (pathname === "/dashboard") return { title: "Endpoint", description: "API endpoint configuration", icon: "api", breadcrumbs: [] };
  return { title: "", description: "", breadcrumbs: [] };
};

export default function Header({ onMenuClick, showMenuButton = true }) {
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const [donateOpen, setDonateOpen] = useState(false);
  const { settings, fetchSettings, patchSettings } = useSettingsStore();
  const uiMode = settings?.uiMode || "expert";
  const pageInfo = useMemo(() => getPageInfo(pathname), [pathname]);
  const { title, description, icon, breadcrumbs } = pageInfo;

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
      } catch {
        if (!cancelled) {
          setDisplayName("");
          setLoginMethod("");
        }
      }
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
    <header className="sticky top-0 z-20 flex h-[60px] shrink-0 items-center justify-between gap-4 border-b border-[#1f2a44] bg-[#0b132a] px-6 text-[#cbd5f5]">
      <div className="hidden items-center gap-2 lg:flex">
        {showMenuButton && (
          <button onClick={onMenuClick} className="grid size-9 place-items-center rounded-xl border border-[#1f2a44] text-[#94a3b8] hover:bg-[#0f1730] hover:text-white">
            <span className="material-symbols-outlined text-[20px]">menu</span>
          </button>
        )}
      </div>

      <nav className="hidden flex-1 items-center justify-end gap-2 lg:flex">
        <Link href="/dashboard/topup" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#94a3b8] hover:bg-[#0f1730] hover:text-white">
          Balance
        </Link>
        <a href="/docs" target="_blank" rel="noreferrer" className="rounded-full px-3 py-1.5 text-[13px] font-medium text-[#94a3b8] hover:bg-[#0f1730] hover:text-white">
          Docs
        </a>
        <a href="/dashboard/changelog" className="relative rounded-full px-3 py-1.5 text-[13px] font-medium text-[#94a3b8] hover:bg-[#0f1730] hover:text-white">
          Release Notes
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#ef4444]" />
        </a>
      </nav>

      <div className="flex flex-1 items-center justify-start lg:hidden">
        {title ? <h1 className="truncate text-[15px] font-semibold text-white">{translate(title)}</h1> : null}
      </div>

      <div className="flex items-center gap-2">
        <ViewAsSwitcher />
        <button className="grid h-9 w-9 place-items-center rounded-full border border-[#1f2a44] bg-[#0b132a] text-[#94a3b8] hover:text-white" aria-label="Help">
          <span className="material-symbols-outlined text-[20px]">help</span>
        </button>
        <button className="relative grid h-9 w-9 place-items-center rounded-full border border-[#1f2a44] bg-[#0b132a] text-[#94a3b8] hover:text-white" aria-label="Notifications">
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ef4444] px-1 text-[10px] font-semibold text-white">1</span>
        </button>
        <ThemeToggle />
        <HeaderMenu onLogout={handleLogout} />
      </div>

      <DonateModal isOpen={donateOpen} onClose={() => setDonateOpen(false)} />
    </header>
  );
}

function HeaderSearch() {
  const visible = useHeaderSearchStore((s) => s.visible);
  const query = useHeaderSearchStore((s) => s.query);
  const placeholder = useHeaderSearchStore((s) => s.placeholder);
  const setQuery = useHeaderSearchStore((s) => s.setQuery);
  if (!visible) return null;
  return (<div className="relative w-[160px] sm:w-[220px]"><span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted text-[16px] pointer-events-none">search</span><input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="w-full h-9 pl-8 pr-8 rounded-xl border border-border bg-surface/80 text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors" />{query && (<button type="button" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-0.5 rounded" aria-label="Clear search"><span className="material-symbols-outlined text-[16px]">close</span></button>)}</div>);
}

Header.propTypes = { onMenuClick: PropTypes.func, showMenuButton: PropTypes.bool };
