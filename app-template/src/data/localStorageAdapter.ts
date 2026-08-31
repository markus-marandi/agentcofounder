import type { StorageAdapter } from "./repository.js";
import { resolveStorage } from "./browserStorage.js";
import { coerceRecords } from "./coerceRecords.js";

export function createLocalStorageAdapter(namespace: string, storage?: Storage): StorageAdapter {
  const resolve = (): Storage | undefined => resolveStorage(storage);

  const keyFor = (collection: string): string => `${namespace}:${collection}`;

  return {
    read(collection) {
      const store = resolve();
      if (!store) throw new Error("localStorage is unavailable");
      let raw: string | null;
      try {
        raw = store.getItem(keyFor(collection));
      } catch (error) {
        throw new Error("localStorage could not be read", { cause: error });
      }
      if (raw === null) return [];
      try {
        return coerceRecords(JSON.parse(raw));
      } catch {
        // A corrupt value is bad data rather than an unavailable store. Recover
        // to the empty state; actual access failures are surfaced above.
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
