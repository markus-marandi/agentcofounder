import { useId } from "react";
import type { FieldSpec } from "../kernel/types.js";
import type { FieldValue } from "../data/operations.js";

interface Props {
  field: FieldSpec;
  value: FieldValue;
  error?: string;
  onChange: (value: FieldValue) => void;
}

/**
 * One accessible control per declared field type. Labels are real `<label>`
 * elements bound by id so automation and screen readers can find controls by
 * name instead of by position.
 */
export function Field({ field, value, error, onChange }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [error ? errorId : null, field.help ? helpId : null].filter(Boolean).join(" ") || undefined;

  const shared = {
    id,
    name: field.name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    required: field.required,
  } as const;

  if (field.type === "boolean") {
    return (
      <div className="field field-checkbox">
        <input
          {...shared}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
        />
        <label htmlFor={id}>{field.label}</label>
        {field.help ? <span id={helpId} className="field-help">{field.help}</span> : null}
        {error ? <span id={errorId} className="field-error">{error}</span> : null}
      </div>
    );
  }

  return (
    <div className={`field${field.type === "longtext" ? " field-wide" : ""}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>

      {field.type === "longtext" ? (
        <textarea {...shared} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
      ) : field.type === "select" ? (
        <select {...shared} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose {field.label.toLowerCase()}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...shared}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          value={value === null ? "" : String(value)}
          min={field.min}
          max={field.max}
          onChange={(event) =>
            onChange(field.type === "number" ? (event.target.value === "" ? null : Number(event.target.value)) : event.target.value)
          }
        />
      )}

      {field.help ? <span id={helpId} className="field-help">{field.help}</span> : null}
      {error ? <span id={errorId} className="field-error">{error}</span> : null}
    </div>
  );
}
