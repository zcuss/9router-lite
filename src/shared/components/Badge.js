"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  default: "bg-[var(--color-surface)]/85 text-[var(--color-text-muted)] border-[var(--color-border-subtle)]",
  primary: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] dark:text-[var(--color-accent)] border-[var(--color-accent)]/18",
  success: "bg-[var(--color-success)]/10 text-[var(--color-success)] dark:text-[var(--color-success)] border-[var(--color-success)]/18",
  warning: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] dark:text-[var(--color-accent)] border-[var(--color-accent)]/18",
  error: "bg-[var(--color-danger)]/10 text-[var(--color-danger)] dark:text-[var(--color-danger)] border-[var(--color-danger)]/18",
  info: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] dark:text-[var(--color-accent)] border-[var(--color-accent)]/18",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon = null,
  className = "",
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border border-[var(--color-border-subtle)]",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            variant === "success" && "bg-[var(--color-success)]",
            variant === "warning" && "bg-[var(--color-accent)]",
            variant === "error" && "bg-[var(--color-danger)]",
            variant === "info" && "bg-[var(--color-accent)]",
            variant === "primary" && "bg-[var(--color-accent)]",
            variant === "default" && "bg-[var(--color-text-muted)]"
          )}
        />
      )}
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
}
