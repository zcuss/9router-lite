"use client";

import { useTheme } from "@/shared/hooks/useTheme";
import { cn } from "@/shared/utils/cn";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className, variant = "default" }) {
  const { isDark, toggleTheme } = useTheme();

  const variants = {
    default: cn(
      "flex items-center justify-center size-9 rounded-md border border-[var(--color-border)]",
      "bg-[var(--color-surface)]/80 text-[var(--color-text-muted)]",
      "hover:bg-[var(--color-surface-2)] hover:text-[var(--color-accent)] transition-colors"
    ),
    card: cn(
      "flex items-center justify-center size-11 rounded-full",
      "bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface)]",
      "border border-[var(--color-border)]",
      "backdrop-blur-md shadow-sm",
      "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]",
      "transition-all group"
    ),
  };

  return (
    <button
      onClick={toggleTheme}
      className={cn(variants[variant], className)}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun size={18} strokeWidth={2} className={variant === "card" ? "transition-transform duration-300 group-hover:rotate-45" : ""} />
      ) : (
        <Moon size={18} strokeWidth={2} className={variant === "card" ? "transition-transform duration-300 group-hover:rotate-12" : ""} />
      )}
    </button>
  );
}
