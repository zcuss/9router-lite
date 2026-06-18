"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Wallet,
  Server,
  Layers,
  Code2,
  Ticket,
  Brain,
  Shield,
  Terminal,
  Puzzle,
  Network,
  Cog,
  CircleUserRound,
  LogOut,
  Hexagon,
} from "lucide-react";
import { cn } from "@/shared/utils/cn";
import useSettingsStore from "@/store/settingsStore";
import { useEffectiveRole } from "@/store/roleStore";

const navGroups = [
  {
    title: "Utama",
    items: [
      { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
      { href: "/dashboard/usage", label: "Pemakaian", icon: BarChart3 },
    ],
  },
  {
    title: "Akses",
    items: [
      { href: "/dashboard/endpoint", label: "Endpoint & Kunci API", icon: Code2 },
    ],
  },
  {
    title: "Saldo",
    items: [
      { href: "/dashboard/topup", label: "Top Up", icon: Wallet },
      { href: "/dashboard/vouchers", label: "Tukar Voucher", icon: Ticket },
    ],
  },
  {
    title: "Akun",
    items: [
      { href: "/dashboard/profile", label: "Profil", icon: CircleUserRound },
    ],
  },
  {
    title: "Manajemen",
    items: [
      { href: "/dashboard/providers", label: "Provider", icon: Server, adminOnly: true },
      { href: "/dashboard/combos", label: "Kombo Model", icon: Layers, adminOnly: true },
      { href: "/dashboard/pricing", label: "Harga & Paket", icon: Layers, adminOnly: true },
      { href: "/dashboard/user-management", label: "Manajemen User", icon: CircleUserRound, adminOnly: true },
    ],
  },
  {
    title: "Rilis & Admin",
    items: [
      { href: "/dashboard/admin/vouchers", label: "Voucher & Top Up", icon: Ticket, adminOnly: true, badgeKey: "pendingPayments" },
      { href: "/dashboard/admin/models", label: "Rilis Model", icon: Layers, adminOnly: true },
    ],
  },
  {
    title: "Lanjutan",
    items: [
      { href: "/dashboard/ai-tuning", label: "Tuning AI", icon: Brain, adminOnly: true },
      { href: "/dashboard/mitm", label: "MITM Proxy", icon: Shield, adminOnly: true },
      { href: "/dashboard/cli-tools", label: "Alat CLI", icon: Terminal, adminOnly: true },
      { href: "/dashboard/skills", label: "Skills", icon: Puzzle, adminOnly: true },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/dashboard/proxy-pools", label: "Proxy Pool", icon: Network, adminOnly: true },
      { href: "/dashboard/console-log", label: "Console", icon: Terminal, adminOnly: true },
      { href: "/dashboard/settings/database", label: "Database", icon: Cog, adminOnly: true },
    ],
  },
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const { settings } = useSettingsStore();
  const effectiveRole = useEffectiveRole();
  const userRole = String(effectiveRole || settings?.userRole || "user").toLowerCase();
  const isPrivileged = userRole === "admin" || userRole === "dev";

  // Pending counts for admin badges (poll every 30s)
  const [pendingCounts, setPendingCounts] = useState({ pendingPayments: 0, pendingTopupRequests: 0 });
  useEffect(() => {
    if (!isPrivileged) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/admin/pending-counts", { cache: "no-store" });
        if (r.ok && !cancelled) {
          const data = await r.json();
          setPendingCounts(data);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [isPrivileged]);

  const isActive = (href) => {
    try {
      const url = new URL(href, "http://localhost");
      const tabParam = url.searchParams.get("tab");
      if (typeof window !== "undefined") {
        const activeTab = new URLSearchParams(window.location.search).get("tab");
        if (tabParam) return pathname === url.pathname && activeTab === tabParam;
        if (pathname === url.pathname && activeTab) return false;
      }
      if (url.pathname === "/dashboard") return pathname === "/dashboard";
      return pathname.startsWith(url.pathname);
    } catch {
      return pathname === href;
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--color-border)] px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <span className="grid size-8 place-items-center rounded-md bg-[var(--color-accent)] text-[var(--color-accent-fg)]">
            <Hexagon className="size-4.5" strokeWidth={2.25} />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold tracking-tight text-[var(--color-text-main)]">
              Zcus Router
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)]">
              Lite
            </span>
          </div>
        </Link>
      </div>

      <nav className="custom-scrollbar flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-4">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => {
            if (item.adminOnly) return isPrivileged;
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.title} className="mb-5">
              <h3 className="mb-1.5 px-3 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-subtle)]">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  const badgeCount = item.badgeKey ? Number(pendingCounts[item.badgeKey] || 0) : 0;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-[var(--color-surface-2)] text-[var(--color-text-main)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-main)]"
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-4 shrink-0",
                          active
                            ? "text-[var(--color-accent)]"
                            : "text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]"
                        )}
                        strokeWidth={2}
                      />
                      <span className="min-w-0 truncate flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <span className="ml-auto grid h-4 min-w-4 place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-[var(--color-accent-fg)]">
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      )}
                      {!badgeCount && active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
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
          className="group flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
        >
          <LogOut className="size-4" strokeWidth={2} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
