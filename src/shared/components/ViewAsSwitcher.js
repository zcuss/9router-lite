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
  { id: null, label: "Real role", desc: "Peran akun sebenarnya", Icon: UserCog },
  { id: "user", label: "User", desc: "Tampilan user: API key, usage, top-up", Icon: User },
  { id: "admin", label: "Admin", desc: "Tampilan operator: providers, voucher, users", Icon: ShieldCheck },
  { id: "dev", label: "Developer", desc: "Full access + system tools", Icon: Cpu },
];

// Clean monochrome roles with yellow accent reserved for highest privilege (dev).
const ROLE_STYLES = {
  user: "border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]",
  admin: "border-[var(--color-border)] bg-transparent text-[var(--color-text-main)]",
  dev: "border-[var(--color-accent)] bg-transparent text-[var(--color-accent)]",
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
        className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-[11px] font-semibold uppercase tracking-wide ${
          ROLE_STYLES[effectiveRole] || ROLE_STYLES.user
        }`}
        title={`Login sebagai ${effectiveRole}`}
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
    ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)] font-bold"
    : ROLE_STYLES[active] || ROLE_STYLES.dev;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 h-8 rounded-md border text-[11px] font-semibold uppercase tracking-wide transition-colors ${style} hover:opacity-80`}
        aria-label="Switch role"
        title={impersonating ? `Viewing as ${active} (real: ${realRole})` : `Login sebagai ${realRole}`}
      >
        {impersonating ? <Eye size={12} strokeWidth={1.8} /> : <ActiveIcon size={12} strokeWidth={1.8} />}
        <span className="hidden sm:inline">{impersonating ? `as ${active}` : active}</span>
        <ChevronDown size={12} strokeWidth={2} className="opacity-70" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] shadow-[0_28px_60px_-30px_rgba(0,0,0,0.35)] z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--color-border-subtle)]">
            <p className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">View as role</p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Real role: <span className="font-semibold uppercase text-[var(--color-text-main)]">{realRole}</span>. Impersonation is dev-only and does not change server privileges.
            </p>
          </div>
          <div className="py-1">
            {ROLES.map(({ id, label, desc, Icon }) => {
              const isActive = (id || realRole) === (viewAs || realRole);
              const isImpersonating = id && id !== realRole;
              return (
                <button
                  key={id || "real"}
                  type="button"
                  onClick={() => {
                    setViewAs(id);
                    setOpen(false);
                    router.refresh();
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2 transition-colors text-left ${
                    isActive ? "bg-[var(--color-accent)]/8" : "hover:bg-[var(--color-surface-2)]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.6} className={`mt-0.5 ${isImpersonating ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-main)]">{label}</span>
                      {id === null && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-[var(--color-text-muted)] uppercase tracking-wider">
                          Default
                        </span>
                      )}
                      {isImpersonating && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent)]/15 text-[var(--color-accent-fg)] uppercase tracking-wider font-bold">
                          Impersonate
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--color-text-muted)] truncate">{desc}</p>
                  </div>
                  {isActive && <Check size={16} strokeWidth={2} className="text-[var(--color-accent)] mt-0.5" />}
                </button>
              );
            })}
          </div>
          {impersonating && (
            <div className="border-t border-[var(--color-border-subtle)] p-2">
              <button
                type="button"
                onClick={() => {
                  setViewAs(null);
                  setOpen(false);
                  router.refresh();
                }}
                className="w-full px-3 py-1.5 rounded-md text-xs font-medium bg-[var(--color-accent)]/15 text-[var(--color-accent-fg)] hover:bg-[var(--color-accent)]/25 transition-colors"
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
