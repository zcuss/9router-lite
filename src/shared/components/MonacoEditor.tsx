"use client";

export default function MonacoEditor({ value = "", defaultValue = "", onChange, language, height = "400px", ...props }: any) {
  return (
    <textarea
      value={value ?? defaultValue}
      onChange={(event) => onChange?.(event.target.value)}
      spellCheck={false}
      data-language={language}
      style={{ height, fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
      className="w-full resize-y rounded-lg border border-black/10 bg-black/5 p-3 text-sm outline-none focus:border-primary dark:border-white/10 dark:bg-white/5"
      {...props}
    />
  );
}
