import { parameters } from "../kernel/config.js";

/**
 * Boundaries are stated where a user can reach them, not buried in a report.
 */
export function Limitations() {
  const limitations = parameters.features.limitations ?? [];
  if (limitations.length === 0) return null;
  return (
    <section className="rounded-lg border border-line px-6 py-5" aria-labelledby="limitations-title">
      <h2 id="limitations-title" className="m-0 text-sm font-semibold text-ink">
        What this version does not do
      </h2>
      <ul className="m-0 mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
        {limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
