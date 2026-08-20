import { useMemo, useState } from "react";
import type { EntitySpec, ScreenSpec } from "../kernel/types.js";
import { parameters } from "../kernel/config.js";
import { useRepository } from "../kernel/useRepository.js";
import { emptyDraft, toRecordInput, validateDraft, type Draft } from "../data/operations.js";
import { Field } from "./Field.js";

/**
 * A clickable walkthrough that keeps what you typed. Input entered on an early
 * screen is still there when you come back, and completing the flow writes one
 * real record — so the prototype demonstrates the product rather than miming it.
 */
export function PrototypeFlow({ entity }: { entity: EntitySpec }) {
  const screens: ScreenSpec[] = parameters.prototype?.screens ?? [];
  const { records, storageError, run, repository } = useRepository(entity.name);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(entity));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);

  const screen = screens[index];
  const fieldsOn = useMemo(() => {
    const wanted = new Set(screen?.collects ?? []);
    return entity.fields.filter((field) => wanted.has(field.name));
  }, [screen, entity]);

  if (!screen) {
    return (
      <p className="notice notice-error" role="alert">
        This walkthrough has no screens configured.
      </p>
    );
  }

  const isLast = index === screens.length - 1;

  const advance = (): void => {
    if (fieldsOn.length > 0) {
      const scoped = validateDraft({ ...entity, fields: fieldsOn }, draft, records);
      setErrors(scoped);
      if (Object.keys(scoped).length > 0) return;
    }
    if (!isLast) {
      setIndex(index + 1);
      return;
    }
    const created = run(() => repository.create(toRecordInput(entity, draft)));
    if (created) setCompleted(true);
  };

  return (
    <div className="stack">
      <div className="screen-progress" role="group" aria-label={`Step ${index + 1} of ${screens.length}`}>
        {screens.map((candidate, position) => (
          <span key={candidate.id} className="screen-dot" data-active={position <= index} />
        ))}
      </div>

      <section className="screen-frame stack" aria-labelledby="screen-title">
        <p className="eyebrow">
          Step {index + 1} of {screens.length}
        </p>
        <h2 id="screen-title">{screen.title}</h2>
        {screen.body ? <p className="muted">{screen.body}</p> : null}

        {fieldsOn.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={draft[field.name] ?? null}
            error={errors[field.name]}
            onChange={(value) => setDraft((current) => ({ ...current, [field.name]: value }))}
          />
        ))}

        {completed ? (
          <p className="notice notice-ok" role="status">
            Saved. {records.length} {records.length === 1 ? entity.label.toLowerCase() : entity.labelPlural.toLowerCase()} stored
            in this browser.
          </p>
        ) : null}

        {storageError ? (
          <p className="notice notice-error" role="alert">
            {storageError}
          </p>
        ) : null}

        <div className="row">
          <button type="button" className="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>
            Back
          </button>
          <button type="button" className="button button-primary" onClick={advance}>
            {isLast ? "Finish" : "Continue"}
          </button>
          {completed ? (
            <button
              type="button"
              className="button button-quiet"
              onClick={() => {
                setDraft(emptyDraft(entity));
                setErrors({});
                setCompleted(false);
                setIndex(0);
              }}
            >
              Start again
            </button>
          ) : null}
        </div>
      </section>

      <p className="muted" style={{ textAlign: "center", fontSize: "0.82rem" }}>
        A walkthrough of the intended flow. Screens are navigable in order and your answers are kept between steps.
      </p>
    </div>
  );
}
