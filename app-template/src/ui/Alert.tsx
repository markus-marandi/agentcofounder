import type { ReactNode } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from "@heroicons/react/20/solid";

export type AlertTone = "warning" | "danger" | "ok" | "neutral";

const toneStyles: Record<AlertTone, { container: string; icon: string; title: string; body: string; Icon: typeof ExclamationTriangleIcon }> = {
  warning: { container: "bg-warning-soft", icon: "text-warning", title: "text-warning", body: "text-warning", Icon: ExclamationTriangleIcon },
  danger: { container: "bg-danger-soft", icon: "text-danger", title: "text-danger", body: "text-danger", Icon: ExclamationTriangleIcon },
  ok: { container: "bg-ok/10", icon: "text-ok", title: "text-ok", body: "text-ok", Icon: CheckCircleIcon },
  neutral: { container: "bg-accent-soft", icon: "text-accent", title: "text-accent", body: "text-ink-soft", Icon: InformationCircleIcon },
};

const toneRole: Record<AlertTone, "alert" | "status"> = {
  warning: "alert",
  danger: "alert",
  ok: "status",
  neutral: "status",
};

/**
 * Vendored from Tailwind Plus feedback/alerts, "With description".
 *
 * The single error/status banner every view uses — nothing renders its own
 * ad hoc alert markup. `role` follows tone so callers never have to remember
 * it: danger/warning interrupt (`alert`), ok/neutral just report (`status`).
 */
export function Alert({ tone, title, children }: { tone: AlertTone; title: string; children?: ReactNode }) {
  const styles = toneStyles[tone];
  return (
    <div className={`rounded-md p-4 ${styles.container}`} role={toneRole[tone]}>
      <div className="flex">
        <div className="shrink-0">
          <styles.Icon aria-hidden="true" className={`size-5 ${styles.icon}`} />
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${styles.title}`}>{title}</h3>
          {children ? <div className={`mt-2 text-sm ${styles.body}`}>{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
