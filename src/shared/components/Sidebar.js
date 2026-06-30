"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import useSettingsStore from "@/store/settingsStore";
import { useEffectiveRole } from "@/store/roleStore";

const navGroups = [
  {
    title: "MAIN",
    items: [
      { href: "/dashboard", label: "Overview", icon: "dashboard" },
      { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { href: "/dashboard/providers", label: "Providers", icon: "dns" },
      { href: "/dashboard/combos", label: "Aliases", icon: "layers" },
      { href: "/dashboard/quota", label: "API Keys", icon: "key" },
      { href: "/dashboard/pricing", label: "Pricing", icon: "payments" },
    ],
  },
  {
    title: "ADVANCED",
    items: [
      { href: "/dashboard/ai-tuning", label: "Features", icon: "extension" },
    ],
  },
  {
    title: "TOOLS",
    items: [
      { href: "/dashboard/cli-tools", label: "CLI Tools", icon: "terminal" },
      { href: "/dashboard/skills", label: "Getting Started", icon: "menu_book" },
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
      if (url.pathname === "/dashboard") return pathname === "/dashboard";
      return pathname.startsWith(url.pathname);
    } catch {
      return pathname === href;
    }
  };

  return (
    <aside className="flex h-full min-h-0 w-[248px] flex-col overflow-hidden border-r border-[#1f2a44] bg-[#0b132a] text-[#cbd5f5]">
      <div className="shrink-0 px-5 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#0f1730] text-[#38bdf8] shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)]">
            <span className="material-symbols-outlined text-[20px]">flash_on</span>
          </div>
          <div>
            <div className="text-[17px] font-semibold tracking-tight text-white">dorouter</div>
            <div className="text-[11px] text-[#64748b]">AI Gateway</div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto px-3 pb-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => !item.adminOnly || userRole === "admin" || userRole === "dev");
          if (!visibleItems.length) return null;

          return (
            <div key={group.title} className="mb-5">
              <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#475569]">
                {group.title}
              </div>
              <div className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-[#0f1730] text-white shadow-[inset_0_0_0_1px_rgba(56,189,248,0.18)]"
                          : "text-[#94a3b8] hover:bg-[#0f1730]/60 hover:text-white"
                      )}
                    >
                      <span className={cn("material-symbols-outlined text-[18px]", active ? "text-[#38bdf8]" : "text-[#64748b]")}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-[#1f2a44] p-4">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#475569]">ACCOUNT</div>
        <div className="px-3 pb-1 text-[13px] font-semibold text-white">{settings?.username || "Masanton"}</div>
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
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-[#94a3b8] hover:bg-[#0f1730]/60 hover:text-white"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}