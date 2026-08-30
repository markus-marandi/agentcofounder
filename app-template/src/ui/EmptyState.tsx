import type { ReactNode } from "react";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";

/** Vendored from Tailwind Plus lists/empty-states, "Simple". */
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
      <DocumentPlusIcon aria-hidden="true" className="mx-auto size-10 text-ink-soft" />
      <h3 className="mt-2 text-sm font-semibold text-ink m-0">{title}</h3>
      {description ? <p className="mt-1 text-sm text-ink-soft mx-auto">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
