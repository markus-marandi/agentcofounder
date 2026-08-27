import { parameters } from "../kernel/config.js";

/**
 * Boundaries are stated where a user can reach them, not buried in a report.
 */
export function Limitations() {
  const limitations = parameters.features.limitations ?? [];
  if (limitations.length === 0) return null;
  return (
    <section
      className="rounded-md border border-line border-l-4 border-l-accent bg-surface px-6 py-4"
      aria-labelledby="limitations-title"
    >
      <h2 id="limitations-title" className="text-sm font-semibold text-ink m-0">
        What this version does not do
      </h2>
      <ul className="text-ink-soft text-sm m-0 mt-2 pl-5 list-disc">
        {limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
