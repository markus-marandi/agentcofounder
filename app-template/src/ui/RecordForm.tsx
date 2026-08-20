import { useEffect, useState } from "react";
import type { EntitySpec, StoredRecord } from "../kernel/types.js";
import {
  draftFromRecord,
  emptyDraft,
  toRecordInput,
  validateDraft,
  type Draft,
  type FieldErrors,
  type FieldValue,
} from "../data/operations.js";
import { Field } from "./Field.js";

interface Props {
  entity: EntitySpec;
  existing: StoredRecord[];
  editing?: StoredRecord;
  onSubmit: (values: Record<string, FieldValue>) => void;
  onCancel?: () => void;
}

/**
 * Validates on submit rather than on every keystroke, so a half-typed value is
 * never reported as wrong. Repeat submissions are harmless: the form re-runs
 * validation against current data each time.
 */
export function RecordForm({ entity, existing, editing, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState<Draft>(() => (editing ? draftFromRecord(entity, editing) : emptyDraft(entity)));
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setDraft(editing ? draftFromRecord(entity, editing) : emptyDraft(entity));
    setErrors({});
  }, [editing, entity]);

  const set = (name: string, value: FieldValue): void => {
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const errorCount = Object.keys(errors).length;

  return (
    <form
      className="stack"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const found = validateDraft(entity, draft, existing, editing?.id);
        setErrors(found);
        if (Object.keys(found).length > 0) return;
        onSubmit(toRecordInput(entity, draft));
        if (!editing) setDraft(emptyDraft(entity));
      }}
    >
      {errorCount > 0 ? (
        <p className="field-error" role="alert">
          {errorCount === 1 ? "One field needs attention." : `${errorCount} fields need attention.`}
        </p>
      ) : null}

      <div className="form-grid">
        {entity.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={draft[field.name] ?? null}
            error={errors[field.name]}
            onChange={(value) => set(field.name, value)}
          />
        ))}
      </div>

      <div className="row">
        <button type="submit" className="button button-primary">
          {editing ? `Save ${entity.label.toLowerCase()}` : `Add ${entity.label.toLowerCase()}`}
        </button>
        {onCancel ? (
          <button type="button" className="button button-quiet" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
