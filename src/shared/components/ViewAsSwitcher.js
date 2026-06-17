"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  ShieldCheck,
  Cpu,
  Eye,
  Check,
  ChevronDown,
  UserCog,
} from "lucide-react";
import useRoleStore, { useEffectiveRole, useCanViewAs } from "@/store/roleStore";

const ROLES = [
  { id: null, label: "Real role", desc: "Your actual account role", Icon: UserCog },
  { id: "user", label: "User", desc: "Customer view: API keys, usage, top-up", Icon: User },
  { id: "admin", label: "Admin", desc: "Operator view: providers, vouchers, users", Icon: ShieldCheck },
  { id: "dev", label: "Developer", desc: "Full access + system tools", Icon: Cpu },
];

const ROLE_STYLES = {
  user: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300",
  admin: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  dev: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300",
};

export default function ViewAsSwitcher() {
  const router = useRouter();
  const realRole = useRoleStore((s) => s.realRole);
  const viewAs = useRoleStore((s) => s.viewAs);
  const setViewAs = useRoleStore((s) => s.setViewAs);
  const effectiveRole = useEffectiveRole();
  const canViewAs = useCanViewAs();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!canViewAs) {
    const RoleIcon = effectiveRole === "admin" ? ShieldCheck : effectiveRole === "dev" ? Cpu : User;
    return (
      <div
        className={`hidden sm:flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-[11px] font-semibold uppercase tracking-wide ${
          ROLE_STYLES[effectiveRole] || ROLE_STYLES.user
        }`}
        title={`Logged in as ${effectiveRole}`}
      >
        <RoleIcon size={12} strokeWidth={1.8} />
        {effectiveRole}
      </div>
    );
  }

  const active = viewAs || realRole;
  const impersonating = !!viewAs && viewAs !== realRole;
  const ActiveIcon = active === "dev" ? Cpu : active === "admin" ? ShieldCheck : User;
  const style = impersonating
    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300"
    : ROLE_STYLES[active] || ROLE_STYLES.dev;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 h-8 rounded-lg border text-[11px] font-semibold uppercase tracking-wide transition-colors ${style} hover:opacity-80`}
        aria-label="Switch role"
        title={impersonating ? `Viewing as ${active} (real: ${realRole})` : `Logged in as ${realRole}`}
      >
        {impersonating ? <Eye size={12} strokeWidth={1.8} /> : <ActiveIcon size={12} strokeWidth={1.8} />}
        <span className="hidden sm:inline">{impersonating ? `as ${active}` : active}</span>
        <ChevronDown size={12} strokeWidth={2} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border-subtle bg-surface shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-border-subtle">
            <p className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">View as role</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Real role: <span className="font-semibold uppercase text-text-main">{realRole}</span>. Impersonation is dev-only and does not change server privileges.
            </p>
          </div>
          <div className="py-1">
            {ROLES.map(({ id, label, desc, Icon }) => {
              const isActive = (id || realRole) === (viewAs || realRole);
              return (
                <button
                  key={id || "real"}
                  type="button"
                  onClick={() => {
                    setViewAs(id);
                    setOpen(false);
                    router.refresh();
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2 hover:bg-surface-2 transition-colors text-left ${
                    isActive ? "bg-blue-500/5" : ""
                  }`}
                >
                  <Icon size={16} strokeWidth={1.6} className="text-text-muted mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-main">{label}</span>
                      {id === null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-text-muted/10 text-text-muted uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted truncate">{desc}</p>
                  </div>
                  {isActive && <Check size={16} strokeWidth={2} className="text-blue-500 mt-0.5" />}
                </button>
              );
            })}
          </div>
          {impersonating && (
            <div className="border-t border-border-subtle p-2">
              <button
                type="button"
                onClick={() => {
                  setViewAs(null);
                  setOpen(false);
                  router.refresh();
                }}
                className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                Stop impersonating
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
