import type { DerivedSpec, StoredRecord } from "../kernel/types.js";
import { computeDerived, formatDerived } from "../data/operations.js";

/** Derived values, computed from the records currently in view. */
export function StatRow({ specs, records }: { specs: DerivedSpec[]; records: StoredRecord[] }) {
  if (specs.length === 0) return null;
  return (
    <div className="stat-row">
      {specs.map((spec) => (
        <div className="stat" key={spec.id}>
          <span className="stat-label" id={`stat-${spec.id}`}>
            {spec.label}
          </span>
          <span className="stat-value" aria-labelledby={`stat-${spec.id}`}>
            {formatDerived(computeDerived(spec, records))}
          </span>
        </div>
      ))}
    </div>
  );
}
