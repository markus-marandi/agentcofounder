import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "accent" | "ok" | "danger";

/**
 * A badge's colour is never decoration: each tone maps to one meaning that is
 * the same everywhere in the app (plain, pointing at the accent, good, bad).
 */
const tones: Record<BadgeTone, string> = {
  neutral: "border-line bg-transparent text-ink-soft",
  accent: "border-accent/40 bg-accent-soft text-accent",
  ok: "border-ok/40 bg-transparent text-ok",
  danger: "border-danger/40 bg-danger-soft text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
