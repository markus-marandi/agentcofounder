import {
  NOW_TOKEN,
  TODAY_TOKEN,
  type ActionSpec,
  type DerivedSpec,
  type EntitySpec,
  type FieldSpec,
  type FilterMode,
  type SortSpec,
  type StoredRecord,
} from "../kernel/types.js";

/** Domain rules. No storage calls, no React — pure functions over records. */

export type FieldValue = string | number | boolean | null;

export type Draft = Record<string, FieldValue>;

export type FieldErrors = Record<string, string>;

/**
 * Fields an action owns end to end — it prompts for them, or writes them, or
 * both. Lending is the example: `borrower` is what the Lend action collects
 * and `lentOn` is what it stamps, so offering either in the *create* form lets
 * someone record a borrower with no date, and a record that is out on loan
 * without ever having been lent. A required field is never withheld: the form
 * has to be able to produce a valid record.
 */
export function actionOwnedFields(entity: EntitySpec): Set<string> {
  const owned = new Set<string>();
  for (const action of entity.actions ?? []) {
    if (action.prompt) owned.add(action.prompt);
    for (const name of Object.keys(action.sets ?? {})) owned.add(name);
  }
  for (const field of entity.fields) {
    // A boolean always has a complete false/true value, so `required` cannot
    // make it missing and must not expose action-owned state during creation.
    if (field.required && field.type !== "boolean") owned.delete(field.name);
  }
  return owned;
}

export function emptyDraft(entity: EntitySpec): Draft {
  const draft: Draft = {};
  for (const field of entity.fields) {
    draft[field.name] = field.type === "boolean" ? false : field.type === "number" ? null : "";
  }
  return draft;
}

export function draftFromRecord(entity: EntitySpec, record: StoredRecord): Draft {
  const draft = emptyDraft(entity);
  for (const field of entity.fields) {
    const value = record[field.name];
    if (value === undefined || value === null) continue;
    draft[field.name] =
      field.type === "boolean"
        ? Boolean(value)
        : field.type === "number"
          ? Number(value)
          : String(value);
  }
  return draft;
}

function isBlank(value: FieldValue): boolean {
  return value === null || value === "" || (typeof value === "string" && value.trim() === "");
}

function validateField(field: FieldSpec, value: FieldValue): string | undefined {
  if (field.required && field.type !== "boolean" && isBlank(value)) {
    return `${field.label} is required.`;
  }
  if (isBlank(value)) return undefined;

  if (field.type === "number") {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return `${field.label} must be a number.`;
    if (field.min !== undefined && numeric < field.min) return `${field.label} cannot be below ${field.min}.`;
    if (field.max !== undefined && numeric > field.max) return `${field.label} cannot be above ${field.max}.`;
  }

  if (field.type === "date" && Number.isNaN(Date.parse(String(value)))) {
    return `${field.label} must be a valid date.`;
  }

  if (field.type === "select" && field.options && !field.options.includes(String(value))) {
    return `${field.label} must be one of: ${field.options.join(", ")}.`;
  }

  if ((field.type === "text" || field.type === "combobox") && String(value).length > 200) {
    return `${field.label} cannot be longer than 200 characters.`;
  }

  return undefined;
}

/**
 * Exported so a single value collected outside the record form — an action's
 * inline prompt — is judged by exactly the same rules as the form.
 */
export function validateValue(field: FieldSpec, value: FieldValue): string | undefined {
  return validateField(field, value);
}

/**
 * `existing` and `excludeId` let uniqueness be checked on both create and edit
 * without a record colliding with itself.
 */
export function validateDraft(
  entity: EntitySpec,
  draft: Draft,
  existing: StoredRecord[] = [],
  excludeId?: string,
): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of entity.fields) {
    const problem = validateField(field, draft[field.name] ?? null);
    if (problem) {
      errors[field.name] = problem;
      continue;
    }
    if (field.unique && !isBlank(draft[field.name] ?? null)) {
      const value = String(draft[field.name]).trim().toLowerCase();
      const clash = existing.some(
        (record) => record.id !== excludeId && String(record[field.name] ?? "").trim().toLowerCase() === value,
      );
      if (clash) errors[field.name] = `A ${entity.label.toLowerCase()} with this ${field.label.toLowerCase()} already exists.`;
    }
  }
  return errors;
}

/**
 * Values already in use for a field: what a `combobox` suggests, and what a
 * new entry is matched against so free text does not fragment into
 * "Cookbook", "cookbook", and " cookbook ".
 */
export function knownValues(field: FieldSpec, existing: StoredRecord[] = []): string[] {
  const used = existing
    .map((record) => String(record[field.name] ?? "").trim())
    .filter((value) => value !== "");
  return [...new Set([...(field.options ?? []), ...used])];
}

/** Returns the established spelling of a value, or the trimmed value when it is new. */
export function canonicalize(value: string, known: string[]): string {
  const trimmed = value.trim().replace(/\s+/gu, " ");
  if (trimmed === "") return "";
  const match = known.find((candidate) => candidate.trim().toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

/**
 * Normalises a validated draft into the value shape actually stored. `existing`
 * is only needed for `combobox` fields, where it decides which spelling of a
 * free-text value wins.
 */
export function toRecordInput(
  entity: EntitySpec,
  draft: Draft,
  existing: StoredRecord[] = [],
): Record<string, FieldValue> {
  const input: Record<string, FieldValue> = {};
  for (const field of entity.fields) {
    const value = draft[field.name] ?? null;
    if (field.type === "boolean") {
      input[field.name] = Boolean(value);
    } else if (field.type === "number") {
      input[field.name] = isBlank(value) ? null : Number(value);
    } else if (field.type === "combobox") {
      input[field.name] = canonicalize(String(value ?? ""), knownValues(field, existing));
    } else {
      input[field.name] = typeof value === "string" ? value.trim() : value;
    }
  }
  return input;
}

export function matches(record: StoredRecord, field: string, mode: FilterMode, value?: unknown): boolean {
  const actual = record[field];
  switch (mode) {
    case "truthy":
      return Boolean(actual);
    case "falsy":
      return !actual;
    case "contains":
      return String(actual ?? "").toLowerCase().includes(String(value ?? "").toLowerCase());
    case "beforeToday": {
      if (typeof actual !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(actual)) return false;
      return actual < new Date().toISOString().slice(0, 10);
    }
    case "equals":
    default:
      return String(actual ?? "") === String(value ?? "");
  }
}

export interface ActiveFilter {
  field: string;
  mode: FilterMode;
  value?: unknown;
}

export function applyFilters(records: StoredRecord[], filters: ActiveFilter[]): StoredRecord[] {
  if (filters.length === 0) return records;
  return records.filter((record) => filters.every((filter) => matches(record, filter.field, filter.mode, filter.value)));
}

/**
 * Resting order for the collection. Numbers compare numerically, everything
 * else by locale so "Émile" lands next to "Emile" rather than after "Z".
 */
export function sortRecords(records: StoredRecord[], sort?: SortSpec): StoredRecord[] {
  if (!sort) return records;
  const direction = sort.direction === "desc" ? -1 : 1;
  return [...records].sort((left, right) => {
    const a = left[sort.field];
    const b = right[sort.field];
    const aBlank = a === undefined || a === null || a === "";
    const bBlank = b === undefined || b === null || b === "";
    // Blanks sink to the bottom in either direction: an unfilled field is not
    // a small value, it is an absent one.
    if (aBlank || bBlank) return aBlank && bBlank ? 0 : aBlank ? 1 : -1;
    if (typeof a === "number" && typeof b === "number") return (a - b) * direction;
    if (typeof a === "boolean" && typeof b === "boolean") return (Number(a) - Number(b)) * direction;
    return String(a).localeCompare(String(b), undefined, { numeric: true }) * direction;
  });
}

/** Whether a row action is offered on this record at all. */
export function actionApplies(action: ActionSpec, record: StoredRecord): boolean {
  if (!action.when) return true;
  return matches(record, action.when.field, action.when.mode, action.when.value);
}

/**
 * The changes an action writes, with `@today` and `@now` resolved. `now` is a
 * parameter so the behaviour is assertable rather than clock-dependent.
 */
export function resolveActionValues(action: ActionSpec, now: Date = new Date()): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const [name, value] of Object.entries(action.sets ?? {})) {
    if (value === TODAY_TOKEN) values[name] = now.toISOString().slice(0, 10);
    else if (value === NOW_TOKEN) values[name] = now.toISOString();
    else values[name] = value;
  }
  return values;
}

function numbersFor(records: StoredRecord[], field: string | undefined): number[] {
  if (!field) return [];
  return records
    .map((record) => Number(record[field]))
    .filter((value) => Number.isFinite(value));
}

/** Returns `null` when a value cannot be computed, so views can say "no data". */
export function computeDerived(spec: DerivedSpec, records: StoredRecord[]): number | null {
  switch (spec.kind) {
    case "count":
      return records.length;
    case "countWhere": {
      if (!spec.where) return null;
      return records.filter((record) => matches(record, spec.where!.field, spec.where!.mode, spec.where!.value)).length;
    }
    case "distinct": {
      if (!spec.field) return null;
      return new Set(records.map((record) => String(record[spec.field!] ?? ""))).size;
    }
    case "sum": {
      const values = numbersFor(records, spec.field);
      return values.reduce((total, value) => total + value, 0);
    }
    case "average": {
      const values = numbersFor(records, spec.field);
      if (values.length === 0) return null;
      return values.reduce((total, value) => total + value, 0) / values.length;
    }
    case "min": {
      const values = numbersFor(records, spec.field);
      return values.length === 0 ? null : Math.min(...values);
    }
    case "max": {
      const values = numbersFor(records, spec.field);
      return values.length === 0 ? null : Math.max(...values);
    }
    default:
      return null;
  }
}

export function formatDerived(value: number | null): string {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
