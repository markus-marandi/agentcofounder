import type { StoredRecord } from "../kernel/types.js";

/**
 * Anything stored by a previous version, a different app on the same origin, or
 * a user editing devtools can be malformed. Reads therefore never throw: a
 * record missing an `id` is dropped, and unparseable JSON yields an empty
 * collection rather than a blank screen.
 */
export function coerceRecords(value: unknown): StoredRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const records: StoredRecord[] = [];
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) continue;
    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.id !== "string" || candidate.id === "") continue;
    if (seen.has(candidate.id)) continue;
    seen.add(candidate.id);
    records.push({
      ...candidate,
      id: candidate.id,
      createdAt: typeof candidate.createdAt === "string" ? candidate.createdAt : new Date(0).toISOString(),
    });
  }
  return records;
}
