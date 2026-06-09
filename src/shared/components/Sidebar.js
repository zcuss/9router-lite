"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import useSettingsStore from "@/store/settingsStore";

const navGroups = [
  {
    title: "General",
    items: [
      { href: "/dashboard", label: "Overview", icon: "dashboard" },
      { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
      { href: "/dashboard/analytics", label: "Analytics", icon: "query_stats" },
    ]
  },
  {
    title: "Setup",
    items: [
      { href: "/dashboard/providers", label: "Providers", icon: "dns" },
      { href: "/dashboard/combos", label: "Aliases (Combos)", icon: "layers" },
    ]
  },
  {
    title: "Management",
    items: [
      { href: "/dashboard/quota", label: "API Keys & Quota", icon: "key" },
      { href: "/dashboard/pricing", label: "Pricing", icon: "payments" },
      { href: "/dashboard/user-management", label: "Users (Dev/Admin)", icon: "manage_accounts", adminOnly: true },
    ]
  },
  {
    title: "Advanced",
    items: [
      { href: "/dashboard/ai-tuning", label: "AI Tuning", icon: "psychology" },
      { href: "/dashboard/mitm", label: "MITM Proxy", icon: "security" },
      { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
      { href: "/dashboard/skills", label: "Skills", icon: "extension" },
    ]
  },
  {
    title: "System",
    items: [
      { href: "/dashboard/proxy-pools", label: "Proxy Pools", icon: "lan" },
      { href: "/dashboard/console-log", label: "Console", icon: "terminal" },
      { href: "/dashboard/settings/database", label: "Database", icon: "storage" },
      { href: "/dashboard/profile", label: "Account", icon: "person" },
    ]
  }
];

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const { settings } = useSettingsStore();
  const userRole = settings?.userRole || "dev"; // default to dev for now

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border-subtle bg-black/40 backdrop-blur-xl transition-all duration-300 min-h-full">
      {/* Brand */}
      <div className="px-6 py-8">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex items-center justify-center size-9 rounded-xl bg-brand-500 shadow-[0_0_20px_rgba(0,255,102,0.3)] group-hover:shadow-[0_0_30px_rgba(0,255,102,0.5)] transition-all">
            <span className="material-symbols-outlined text-black text-[20px] font-bold">hub</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
              {APP_CONFIG.name}
            </h1>
            <span className="text-[10px] text-brand-500 font-mono tracking-widest uppercase">
              Lite Edition
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 px-4 space-y-8 overflow-y-auto custom-scrollbar pb-10">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(item => !item.adminOnly || userRole === "admin" || userRole === "dev");
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1">
              <h3 className="px-4 text-[10px] font-bold text-text-muted/40 uppercase tracking-[0.2em] mb-2">
                {group.title}
              </h3>
              <div className="space-y-0.5">
                {visibleItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2 rounded-lg transition-all relative group",
                      isActive(item.href)
                        ? "bg-brand-500/10 text-brand-500"
                        : "text-text-muted/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    {isActive(item.href) && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] bg-brand-500 rounded-r-full shadow-[0_0_10px_#00ff66]" />
                    )}
                    <span className={cn(
                      "material-symbols-outlined text-[20px]",
                      isActive(item.href) ? "fill-1" : "group-hover:scale-110 transition-transform"
                    )}>
                      {item.icon}
                    </span>
                    <span className="text-[13px] font-medium tracking-wide">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-border-subtle">
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-all group"
        >
          <span className="material-symbols-outlined text-[20px] group-hover:rotate-180 transition-transform duration-500">
            logout
          </span>
          <span className="text-[13px] font-medium tracking-wide">Sign out</span>
        </Link>
      </div>
    </aside>
  );
}
