import { parameters } from "../kernel/config.js";

/**
 * Boundaries are stated where a user can reach them, not buried in a report.
 */
export function Limitations() {
  const limitations = parameters.features.limitations ?? [];
  if (limitations.length === 0) return null;
  return (
    <section className="notice" aria-labelledby="limitations-title">
      <h2 id="limitations-title" style={{ fontSize: "0.95rem" }}>
        What this version does not do
      </h2>
      <ul className="muted" style={{ margin: 0, paddingLeft: "1.1rem" }}>
        {limitations.map((limitation) => (
          <li key={limitation}>{limitation}</li>
        ))}
      </ul>
    </section>
  );
}
