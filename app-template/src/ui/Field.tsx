import { useId } from "react";
import type { FieldSpec } from "../kernel/types.js";
import type { FieldValue } from "../data/operations.js";

interface Props {
  field: FieldSpec;
  value: FieldValue;
  error?: string;
  /** Extra `combobox` suggestions beyond `field.options` — usually values other records already use. */
  suggestions?: string[];
  onChange: (value: FieldValue) => void;
}

/**
 * One accessible control per declared field type. Labels are real `<label>`
 * elements bound by id so automation and screen readers can find controls by
 * name instead of by position.
 */
export function Field({ field, value, error, suggestions, onChange }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const listId = `${id}-options`;
  const describedBy = [error ? errorId : null, field.help ? helpId : null].filter(Boolean).join(" ") || undefined;

  const shared = {
    id,
    name: field.name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    required: field.required,
  } as const;

  const inputClasses =
    "block w-full rounded-md border border-line bg-surface px-3 py-2 text-ink placeholder:text-ink-soft " +
    "focus:outline-none aria-invalid:border-danger sm:text-sm";

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <input
          {...shared}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-line text-accent"
        />
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {field.label}
        </label>
        {field.help ? (
          <span id={helpId} className="text-sm text-ink-soft">
            {field.help}
          </span>
        ) : null}
        {error ? (
          <span id={errorId} className="text-sm text-danger">
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={field.type === "longtext" ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {field.label}
        {field.required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <div className="mt-1">
        {field.type === "longtext" ? (
          <textarea
            {...shared}
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            className={`${inputClasses} min-h-24`}
          />
        ) : field.type === "select" ? (
          <select
            {...shared}
            value={String(value ?? "")}
            onChange={(event) => onChange(event.target.value)}
            className={inputClasses}
          >
            <option value="">Choose {field.label.toLowerCase()}</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : field.type === "combobox" ? (
          // Suggestions without a closed set: the listed options are offered,
          // and a value nobody has used yet is still accepted.
          <>
            <input
              {...shared}
              type="text"
              list={listId}
              autoComplete="off"
              value={String(value ?? "")}
              onChange={(event) => onChange(event.target.value)}
              className={inputClasses}
            />
            <datalist id={listId}>
              {[...new Set([...(field.options ?? []), ...(suggestions ?? [])])]
                .filter((option) => option !== "")
                .map((option) => (
                  <option key={option} value={option} />
                ))}
            </datalist>
          </>
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
            className={inputClasses}
          />
        )}
      </div>

      {field.help ? (
        <span id={helpId} className="mt-1 block text-sm text-ink-soft">
          {field.help}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="mt-1 block text-sm text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}
