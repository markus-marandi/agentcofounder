import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center rounded-lg border border-dashed border-line bg-surface px-6 py-16">
      <h3 className="text-sm font-semibold text-ink m-0">{title}</h3>
      {description ? <p className="mt-1 text-sm text-ink-soft mx-auto">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
