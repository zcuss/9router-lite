"use client";

import { cn } from "@/shared/utils/cn";

export default function Select({
  label = "",
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  error = "",
  hint = "",
  disabled = false,
  className = "",
  selectClassName = "",
  ...props
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-sm font-medium text-[var(--color-text-main)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={cn(
            "w-full py-2.5 px-3 pr-10 text-sm text-[var(--color-text-main)]",
            "bg-[var(--color-surface)]/85 border border-[var(--color-border-subtle)] rounded-xl appearance-none backdrop-blur-xl",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/40",
            "transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            "text-[16px] sm:text-sm",
            error && "ring-1 ring-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]/40 border-[var(--color-danger)]/40",
            selectClassName
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--color-text-muted)]">
          <span className="material-symbols-outlined text-[20px]">expand_more</span>
        </div>
      </div>
      {error && (
        <p className="text-xs text-[var(--color-danger)] flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      )}
    </div>
  );
}
