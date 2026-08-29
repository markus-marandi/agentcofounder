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
 * name instead of by position.
 *
 * Styling is vendored from Tailwind Plus (forms/input-groups "Input with
 * label", forms/textareas "Simple", forms/select-menus "Simple native" —
 * the chevron overlay, and forms/toggles "Simple toggle" for `boolean`) —
 * see THIRD_PARTY_NOTICES.md. A restyle only: field types and behavior are
 * unchanged, still driven entirely by `FieldSpec`.
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
    "block w-full rounded-md bg-surface px-3 py-1.5 text-ink placeholder:text-ink-soft outline outline-line " +
    "focus:outline-2 focus:outline-accent aria-invalid:outline-danger sm:text-sm";

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-3">
        <span className="group relative inline-flex h-6 w-11 shrink-0 rounded-full bg-line p-0.5 has-checked:bg-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
          <span
            aria-hidden="true"
            className="size-5 rounded-full bg-surface shadow-xs transition-transform duration-200 ease-in-out group-has-checked:translate-x-5"
          />
          <input
            {...shared}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="absolute inset-0 appearance-none focus:outline-none"
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
            className={`${inputClasses} min-h-24`}
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
              className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-ink-soft"
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
