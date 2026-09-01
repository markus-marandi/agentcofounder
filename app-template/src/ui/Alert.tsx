import type { ReactNode } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/20/solid";

export type AlertTone = "warning" | "danger" | "ok" | "neutral";

type ToneSpec = {
  surface: string;
  ink: string;
  body: string;
  Icon: typeof ExclamationTriangleIcon;
  /** Interrupt the reader (`alert`) or report quietly (`status`). */
  interrupt: boolean;
};

const tones: Record<AlertTone, ToneSpec> = {
  warning: { surface: "bg-warning-soft", ink: "text-warning", body: "text-warning", Icon: ExclamationTriangleIcon, interrupt: true },
  danger: { surface: "bg-danger-soft", ink: "text-danger", body: "text-danger", Icon: ExclamationTriangleIcon, interrupt: true },
  ok: { surface: "bg-ok/10", ink: "text-ok", body: "text-ok", Icon: CheckCircleIcon, interrupt: false },
  neutral: { surface: "bg-accent-soft", ink: "text-accent", body: "text-ink-soft", Icon: InformationCircleIcon, interrupt: false },
};

/**
 * The one status banner every view shares — a tone, a title, and optional
 * detail. The ARIA role follows the tone so callers never pick it: warning
 * and danger interrupt, the rest report.
 */
export function Alert({ tone, title, children }: { tone: AlertTone; title: string; children?: ReactNode }) {
  const t = tones[tone];
  return (
    <div role={t.interrupt ? "alert" : "status"} className={`flex gap-3 rounded-md p-4 ${t.surface}`}>
      <t.Icon aria-hidden="true" className={`size-5 shrink-0 ${t.ink}`} />
      <div className="min-w-0">
        <h3 className={`text-sm font-medium ${t.ink}`}>{title}</h3>
        {children ? <div className={`mt-1.5 text-sm ${t.body}`}>{children}</div> : null}
      </div>
    </div>
  );
}
