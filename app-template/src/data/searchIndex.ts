import type { EntitySpec, StoredRecord } from "../kernel/types.js";

/**
 * Substring search across an entity's text-bearing fields. Deliberately local
 * and dependency-free: the app must work with no network.
 */
export function searchableText(entity: EntitySpec, record: StoredRecord): string {
  return entity.fields
    .filter((field) => field.type !== "boolean")
    .map((field) => String(record[field.name] ?? ""))
    .join(" ")
    .toLowerCase();
}

export function searchRecords(entity: EntitySpec, records: StoredRecord[], query: string): StoredRecord[] {
  const terms = query.toLowerCase().split(/\s+/u).filter((term) => term !== "");
  if (terms.length === 0) return records;
  return records.filter((record) => {
    const haystack = searchableText(entity, record);
    return terms.every((term) => haystack.includes(term));
  });
}
