import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "ok" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-sunk text-ink-soft ring-line",
  accent: "bg-accent-soft text-accent ring-accent/30",
  ok: "bg-ok/10 text-ok ring-ok/25",
  danger: "bg-danger-soft text-danger ring-danger/20",
};

/**
 * Vendored from Tailwind Plus elements/badges ("With border"). The source
 * example has 8 literal colours with no semantic meaning; collapsed here
 * onto this app's 4 semantic tones so a badge's colour always means the
 * same thing everywhere it's used.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
