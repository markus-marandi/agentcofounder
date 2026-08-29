import type { DerivedSpec, EntitySpec, FieldSpec, FilterMode, StoredRecord } from "../kernel/types.js";

/** Domain rules. No storage calls, no React — pure functions over records. */

export type FieldValue = string | number | boolean | null;

export type Draft = Record<string, FieldValue>;

export type FieldErrors = Record<string, string>;

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

  if (field.type === "text" && String(value).length > 200) {
    return `${field.label} cannot be longer than 200 characters.`;
  }

  return undefined;
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

/** Normalises a validated draft into the value shape actually stored. */
export function toRecordInput(entity: EntitySpec, draft: Draft): Record<string, FieldValue> {
  const input: Record<string, FieldValue> = {};
  for (const field of entity.fields) {
    const value = draft[field.name] ?? null;
    if (field.type === "boolean") {
      input[field.name] = Boolean(value);
    } else if (field.type === "number") {
      input[field.name] = isBlank(value) ? null : Number(value);
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
      const timestamp = Date.parse(String(actual ?? ""));
      if (Number.isNaN(timestamp)) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return timestamp < today.getTime();
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
