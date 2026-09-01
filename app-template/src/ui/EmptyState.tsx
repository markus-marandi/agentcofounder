import type { ReactNode } from "react";
import { DocumentPlusIcon } from "@heroicons/react/24/outline";

/**
 * What a view says when there is nothing to show: one sentence of
 * explanation and, when the caller has one, the first move to make.
 */
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
    <div className="rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-surface-sunk">
        <DocumentPlusIcon aria-hidden="true" className="size-5 text-ink-soft" />
      </div>
      <h3 className="m-0 mt-4 text-sm font-semibold text-ink">{title}</h3>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
