import { useState } from "react";
import positioning from "../content/positioning.json";
import type { EntitySpec } from "../kernel/types.js";
import { parameters } from "../kernel/config.js";
import { useRepository } from "../kernel/useRepository.js";
import { toRecordInput, validateDraft, emptyDraft, type Draft } from "../data/operations.js";
import { Alert } from "./Alert.js";
import { Field } from "./Field.js";

/**
 * A marketing page that still stores something. The capture form writes real
 * records through the repository, so signups survive a refresh and can be
 * reviewed — a landing page with a form that discards its input is a mock, not
 * a product.
 */
export function LandingPage({ entity }: { entity: EntitySpec }) {
  const landing = parameters.landing;
  const sections = landing?.sections ?? ["hero", "features", "cta"];
  const { records, storageError, run, repository } = useRepository(entity.name);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(entity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const captureForm = (
    <form
      className="stack"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const found = validateDraft(entity, draft, records);
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        const created = run(() => repository.create(toRecordInput(entity, draft)));
        if (created) {
          setDraft(emptyDraft(entity));
          setSaved(true);
        }
      }}
    >
      <div className="form-grid">
        {entity.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={draft[field.name] ?? null}
            error={errors[field.name]}
            onChange={(value) => setDraft((current) => ({ ...current, [field.name]: value }))}
          />
        ))}
      </div>
      <button type="submit" className="button button-primary">
        {landing?.callToAction ?? "Join the list"}
      </button>
      {saved ? (
        <p className="notice notice-ok" role="status">
          Saved. You are number {records.length} on the list, kept in this browser.
        </p>
      ) : null}
      {storageError ? <Alert tone="danger" title={storageError} /> : null}
    </form>
  );

  return (
    <>
      {sections.includes("hero") ? (
        <section className="hero">
          <div className="hero-inner">
            <div>
              <p className="eyebrow">{parameters.product.name}</p>
              <h1>{parameters.product.tagline}</h1>
              {parameters.product.description ? <p className="hero-lede">{parameters.product.description}</p> : null}
              <div style={{ marginTop: "1.25rem", maxWidth: "26rem" }}>{captureForm}</div>
            </div>
            <div className="hero-art" role="presentation" />
          </div>
        </section>
      ) : null}

      {sections.includes("subhero") ? (
        <section className="section">
          <div className="section-inner">
            <h2>Built for one person to actually finish</h2>
            <p className="muted">
              Everything runs in this browser. There is no account to make, no server to wait for, and nothing to
              configure before the first entry.
            </p>
          </div>
        </section>
      ) : null}

      {sections.includes("features") ? (
        <section className="section" aria-labelledby="features-title">
          <div className="section-inner stack">
            <h2 id="features-title">What you get</h2>
            <div className="feature-grid">
              {positioning.proofPatterns.map((claim) => (
                <div className="card" key={claim}>
                  <p style={{ margin: 0 }}>{claim}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {sections.includes("comparison") ? (
        <section className="section" aria-labelledby="comparison-title">
          <div className="section-inner stack">
            <h2 id="comparison-title">How people handle this today</h2>
            <div className="table-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Approach</th>
                    <th scope="col">What works</th>
                    <th scope="col">Where it falls down</th>
                  </tr>
                </thead>
                <tbody>
                  {positioning.archetypes.slice(0, 3).map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.name}</th>
                      <td>{row.strength}</td>
                      <td>{row.weakness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: "0.82rem" }}>
              General comparisons to common alternatives, not claims about any named product.
            </p>
          </div>
        </section>
      ) : null}

      {sections.includes("faq") ? (
        <section className="section" aria-labelledby="faq-title">
          <div className="section-inner stack">
            <h2 id="faq-title">Questions</h2>
            {positioning.faq.map((item) => (
              <div className="card" key={item.question}>
                <h3>{item.question}</h3>
                <p style={{ margin: 0 }} className="muted">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sections.includes("cta") ? (
        <section className="section" aria-labelledby="cta-title">
          <div className="section-inner cta stack">
            <h2 id="cta-title">{landing?.callToAction ?? "Get started"}</h2>
            <div style={{ maxWidth: "26rem" }}>{captureForm}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
