import type { DerivedSpec, StoredRecord } from "../kernel/types.js";
import { computeDerived, formatDerived } from "../data/operations.js";
import { Card } from "./Card.js";

/**
 * How many columns the row settles into on a wide screen. Written out as whole
 * class strings rather than composed from `specs.length`, because Tailwind
 * scans this file as text: a class it cannot see spelled out is a class it
 * does not generate.
 */
const columns: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
};

/** Derived values, computed from the records currently in view. */
export function StatRow({ specs, records }: { specs: DerivedSpec[]; records: StoredRecord[] }) {
  if (specs.length === 0) return null;
  // Two totals should fill the row, not sit in the first two of four columns.
  const wide = columns[Math.min(specs.length, 4)] ?? columns[4];
  return (
    <dl className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${wide}`}>
      {specs.map((spec) => (
        <Card key={spec.id} className="px-4 py-5 sm:px-6">
          <dt className="text-sm font-medium text-ink-soft" id={`stat-${spec.id}`}>
            {spec.label}
          </dt>
          <dd
            className="mt-1 text-2xl font-semibold tracking-tight text-ink tabular-nums"
            aria-labelledby={`stat-${spec.id}`}
          >
            {formatDerived(computeDerived(spec, records))}
          </dd>
        </Card>
      ))}
    </dl>
  );
}
