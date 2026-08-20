import type { StoredRecord } from "../kernel/types.js";

/**
 * The single boundary between the interface and stored data.
 *
 * Components never touch a storage API directly. Swapping localStorage for a
 * network-backed store means writing one more `StorageAdapter` and passing it
 * to `createRepository`; no component changes.
 */
export interface StorageAdapter {
  /** Returns every record for a collection, or an empty array when unreadable. */
  read(collection: string): StoredRecord[];
  write(collection: string, records: StoredRecord[]): void;
  /** Notifies when another tab or window changes the same collection. */
  subscribe?(collection: string, listener: () => void): () => void;
}

export interface Repository<T extends StoredRecord = StoredRecord> {
  list(): T[];
  get(id: string): T | undefined;
  create(input: Omit<T, "id" | "createdAt">): T;
  update(id: string, changes: Partial<Omit<T, "id" | "createdAt">>): T | undefined;
  remove(id: string): boolean;
  replaceAll(records: T[]): void;
  subscribe(listener: () => void): () => void;
}

export class StorageUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Changes could not be saved. This browser is blocking or is out of storage.");
    this.name = "StorageUnavailableError";
    this.cause = cause;
  }
}

let counter = 0;

/** Unique without `crypto.randomUUID`, which jsdom does not always provide. */
export function nextId(): string {
  counter += 1;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createRepository<T extends StoredRecord = StoredRecord>(
  collection: string,
  adapter: StorageAdapter,
): Repository<T> {
  const listeners = new Set<() => void>();
  let cache: T[] | undefined;

  const announce = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const load = (): T[] => {
    if (cache === undefined) cache = adapter.read(collection) as T[];
    return cache;
  };

  const persist = (records: T[]): void => {
    try {
      adapter.write(collection, records);
    } catch (error) {
      // The cache is not updated, so the interface still shows the last good
      // state rather than a change that was never stored.
      throw new StorageUnavailableError(error);
    }
    cache = records;
    announce();
  };

  if (adapter.subscribe) {
    adapter.subscribe(collection, () => {
      cache = undefined;
      announce();
    });
  }

  return {
    list: () => [...load()],
    get: (id) => load().find((record) => record.id === id),
    create(input) {
      const record = { ...input, id: nextId(), createdAt: new Date().toISOString() } as T;
      persist([...load(), record]);
      return record;
    },
    update(id, changes) {
      const records = load();
      const index = records.findIndex((record) => record.id === id);
      if (index < 0) return undefined;
      // `id` and `createdAt` are the kernel's; a caller cannot overwrite them.
      const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safe } = changes as Record<string, unknown>;
      const updated = { ...records[index], ...safe } as T;
      const next = [...records];
      next[index] = updated;
      persist(next);
      return updated;
    },
    remove(id) {
      const records = load();
      const next = records.filter((record) => record.id !== id);
      if (next.length === records.length) return false;
      persist(next);
      return true;
    },
    replaceAll(records) {
      persist([...records]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
