"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  primary: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-accent-fg)] shadow-[0_12px_28px_-18px_rgba(250,204,21,0.7)] disabled:bg-[var(--color-surface-3)] disabled:text-[var(--color-text-muted)]",
  secondary: "bg-[var(--color-surface)]/90 hover:bg-[var(--color-surface-2)] text-[var(--color-text-main)] border border-[var(--color-border)] disabled:opacity-50",
  outline: "border border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-surface-2)] hover:border-[var(--color-accent)]/40",
  ghost: "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-main)]",
  danger: "bg-[var(--color-danger)] hover:opacity-90 text-white shadow-sm disabled:bg-[var(--color-surface-3)] disabled:text-[var(--color-text-muted)]",
  "danger-soft": "border border-[var(--color-danger)]/30 text-[var(--color-danger)] bg-transparent hover:bg-[var(--color-danger)]/10 disabled:opacity-50",
  success: "bg-[var(--color-success)] hover:opacity-90 text-white shadow-sm disabled:bg-[var(--color-surface-3)] disabled:text-[var(--color-text-muted)]",
};

const sizes = {
  sm: "h-7 px-3 text-xs rounded-lg",
  md: "h-9 px-4 text-sm rounded-xl",
  lg: "h-11 px-6 text-sm rounded-xl",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon = null,
  iconRight = null,
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  ...props
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 ease-out cursor-pointer",
        "active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="material-symbols-outlined text-[18px]">{iconRight}</span>
      )}
    </button>
  );
}
