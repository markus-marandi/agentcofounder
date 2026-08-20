import type { StorageAdapter } from "./repository.js";
import type { StoredRecord } from "../kernel/types.js";

/**
 * Used by tests and by `persistence.adapter: "memory"`. Also the worked example
 * for adding a real backend: implement these three methods and nothing above
 * the repository changes.
 */
export function createMemoryAdapter(seed: Record<string, StoredRecord[]> = {}): StorageAdapter {
  const store = new Map<string, StoredRecord[]>(Object.entries(seed));
  return {
    read: (collection) => [...(store.get(collection) ?? [])],
    write: (collection, records) => {
      store.set(collection, [...records]);
    },
  };
}
