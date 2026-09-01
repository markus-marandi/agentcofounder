import { useId } from "react";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
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
 * name instead of by position. The look: bordered fields on the surface,
 * the accent on focus, `danger` on an invalid value — all from theme tokens.
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
    "block w-full rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft " +
    "focus:border-accent focus:outline-none aria-invalid:border-danger";

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-line transition-colors has-checked:bg-accent">
          <input
            {...shared}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="peer absolute inset-0 cursor-pointer appearance-none focus:outline-none"
          />
          <span
            aria-hidden="true"
            className="ml-0.5 size-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
          />
        </span>
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
            className={`${inputClasses} min-h-20`}
          />
        ) : field.type === "select" ? (
          <div className="relative">
            <select
              {...shared}
              value={String(value ?? "")}
              onChange={(event) => onChange(event.target.value)}
              className={`${inputClasses} appearance-none pr-8`}
            >
              <option value="">Choose {field.label.toLowerCase()}</option>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDownIcon
              aria-hidden="true"
              className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
            />
          </div>
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
