"use client";

const OPTIONS = [
  { value: "1h", label: "1H" },
  { value: "6h", label: "6H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
];

export default function TimeRangeSelector({ value = "24h", onChange }: { value?: string; onChange?: (value: any) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-black/5 bg-black/2 p-1 dark:border-white/5 dark:bg-white/2">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange?.(option.value)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-text-muted hover:bg-black/5 hover:text-text dark:hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
