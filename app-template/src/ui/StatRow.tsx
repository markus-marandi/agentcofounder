import type { DerivedSpec, StoredRecord } from "../kernel/types.js";
import { computeDerived, formatDerived } from "../data/operations.js";

/** Derived values, computed from the records currently in view. */
export function StatRow({ specs, records }: { specs: DerivedSpec[]; records: StoredRecord[] }) {
  if (specs.length === 0) return null;
  return (
    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {specs.map((spec) => (
        <div key={spec.id} className="rounded-lg border border-line bg-surface px-4 py-5 sm:px-6">
          <dt className="text-sm font-medium text-ink-soft" id={`stat-${spec.id}`}>
            {spec.label}
          </dt>
          <dd
            className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums"
            aria-labelledby={`stat-${spec.id}`}
          >
            {formatDerived(computeDerived(spec, records))}
          </dd>
        </div>
      ))}
    </dl>
  );
}
