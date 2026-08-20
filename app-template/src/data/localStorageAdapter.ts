import type { StorageAdapter } from "./repository.js";
import type { StoredRecord } from "../kernel/types.js";
import { resolveStorage } from "./browserStorage.js";

/**
 * Anything stored by a previous version, a different app on the same origin, or
 * a user editing devtools can be malformed. Reads therefore never throw: a
 * record missing an `id` is dropped, and unparseable JSON yields an empty
 * collection rather than a blank screen.
 */
function coerceRecords(value: unknown): StoredRecord[] {
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

export function createLocalStorageAdapter(namespace: string, storage?: Storage): StorageAdapter {
  const resolve = (): Storage | undefined => resolveStorage(storage);

  const keyFor = (collection: string): string => `${namespace}:${collection}`;

  return {
    read(collection) {
      const store = resolve();
      if (!store) return [];
      try {
        const raw = store.getItem(keyFor(collection));
        if (raw === null) return [];
        return coerceRecords(JSON.parse(raw));
      } catch {
        return [];
      }
    },
    write(collection, records) {
      const store = resolve();
      // Absent storage is reported so the repository can surface it, rather
      // than silently accepting a change that will vanish on refresh.
      if (!store) throw new Error("localStorage is unavailable");
      store.setItem(keyFor(collection), JSON.stringify(records));
    },
    subscribe(collection, listener) {
      const key = keyFor(collection);
      const handler = (event: StorageEvent): void => {
        if (event.key === null || event.key === key) listener();
      };
      globalThis.addEventListener?.("storage", handler);
      return () => globalThis.removeEventListener?.("storage", handler);
    },
  };
}
