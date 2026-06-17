"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import useSettingsStore from "@/store/settingsStore";
import { useEffectiveRole } from "@/store/roleStore";

const navGroups = [
  {
    title: "Utama",
    items: [
      { href: "/dashboard", label: "Beranda", icon: "dashboard" },
      { href: "/dashboard/usage", label: "Pemakaian", icon: "bar_chart" },
      { href: "/dashboard/analytics", label: "Analitik", icon: "query_stats" },
      { href: "/dashboard/topup", label: "Isi Saldo (Top Up)", icon: "add_card" },
    ],
  },
  {
    title: "Konfigurasi",
    items: [
      { href: "/dashboard/providers", label: "Provider", icon: "dns" },
      { href: "/dashboard/combos", label: "Kombo Model", icon: "layers" },
      { href: "/dashboard/endpoint", label: "Endpoint", icon: "api" },
    ],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/dashboard/quota", label: "API Key & Kuota", icon: "key" },
      { href: "/dashboard/pricing", label: "Tarif & Langganan", icon: "payments" },
      { href: "/dashboard/user-management", label: "Pengguna (Dev/Admin)", icon: "manage_accounts", adminOnly: true },
    ],
  },
  {
    title: "Kontrol Admin",
    items: [
      { href: "/dashboard/admin/vouchers", label: "Kelola Voucher", icon: "confirmation_number", adminOnly: true },
      { href: "/dashboard/admin/models", label: "Rilis & Tambah Model", icon: "publish", adminOnly: true },
    ],
  },
  {
    title: "Lanjutan",
    items: [
      { href: "/dashboard/ai-tuning", label: "AI Tuning", icon: "psychology" },
      { href: "/dashboard/mitm", label: "MITM Proxy", icon: "security" },
      { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
      { href: "/dashboard/skills", label: "Skills", icon: "extension" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
      { href: "/dashboard/console-log", label: "Konsol", icon: "terminal" },
      { href: "/dashboard/settings/database", label: "Basis Data", icon: "storage" },
      { href: "/dashboard/profile", label: "Akun", icon: "person" },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const { settings } = useSettingsStore();
  const effectiveRole = useEffectiveRole();
  const userRole = String(effectiveRole || settings?.userRole || "dev").toLowerCase();

  const isActive = (href) => {
    try {
      const url = new URL(href, "http://localhost");
      const tabParam = url.searchParams.get("tab");

      if (typeof window !== "undefined") {
        const activeTab = new URLSearchParams(window.location.search).get("tab");
        if (tabParam) {
          return pathname === url.pathname && activeTab === tabParam;
        }
        if (pathname === url.pathname && activeTab) {
          return false;
        }
      }

      if (url.pathname === "/dashboard") return pathname === "/dashboard";
      return pathname.startsWith(url.pathname);
    } catch {
      return pathname === href;
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-64 flex-col overflow-hidden border-r border-border-subtle bg-sidebar/88 backdrop-blur-2xl transition-all duration-300 shadow-[12px_0_40px_-30px_rgba(15,23,42,0.45)]">
      <div className="shrink-0 px-5 py-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-500 to-cyan-400 text-white shadow-[0_14px_36px_-20px_rgba(6,182,212,0.9)] transition-all group-hover:scale-[1.03]">
            <span className="material-symbols-outlined text-[21px] font-bold">hub</span>
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-lg font-semibold tracking-tight text-text-main leading-tight">{APP_CONFIG.name}</h1>
            <span className="text-[10px] text-text-muted font-mono tracking-[0.22em] uppercase">Lite Edition</span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-8 custom-scrollbar">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || userRole === "admin" || userRole === "dev");
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-4 space-y-1">
              <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle/80">{group.title}</h3>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150",
                        active
                          ? "bg-brand-500/12 text-brand-600 dark:text-brand-300 shadow-[inset_0_0_0_1px_rgba(6,182,212,0.16)]"
                          : "text-text-muted hover:bg-surface-2/70 hover:text-text-main"
                      )}
                    >
                      {active && (
                        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-500 shadow-[0_0_12px_rgba(6,182,212,0.65)]" />
                      )}
                      <span className={cn("material-symbols-outlined text-[20px] transition-transform", active ? "fill-1" : "group-hover:scale-105")}>{item.icon}</span>
                      <span className="min-w-0 truncate text-[13px] font-medium tracking-wide">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-border-subtle p-3">
        <button
          type="button"
          onClick={async () => {
            try {
              const res = await fetch("/api/auth/logout", { method: "POST" });
              if (res.ok) window.location.href = "/login";
            } catch (err) {
              console.error("Failed to logout:", err);
            }
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-red-500/70 transition-all hover:bg-red-500/10 hover:text-red-500"
        >
          <span className="material-symbols-outlined text-[20px] transition-transform duration-500 group-hover:rotate-180">logout</span>
          <span className="text-[13px] font-medium tracking-wide">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
