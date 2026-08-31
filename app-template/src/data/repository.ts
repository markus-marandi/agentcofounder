import type { StoredRecord } from "../kernel/types.js";

/**
 * The single boundary between the interface and stored data.
 *
 * Components never touch a storage API directly. Swapping localStorage for a
 * database or an HTTP service means writing one more `StorageAdapter` and
 * passing it to `createRepository`; nothing above this file changes.
 *
 * That claim only holds because the adapter may be **asynchronous**. A local
 * store answers immediately; a network or a database answers later, and both
 * satisfy the same interface. `createRepository` absorbs the difference: it
 * keeps a synchronous cache to read from and applies every write optimistically,
 * rolling back and reporting when the store rejects it. Views therefore stay
 * synchronous whatever is underneath them.
 *
 * See `createHttpAdapter` for a working remote implementation and
 * `adapterContract` for the suite every adapter has to pass.
 */
export type MaybePromise<T> = T | Promise<T>;

export interface StorageAdapter {
  /** Every record for a collection. Never throws: unreadable data is an empty collection. */
  read(collection: string): MaybePromise<StoredRecord[]>;
  /** Persists the collection. Rejects (throws, or returns a rejected promise) when the write fails. */
  write(collection: string, records: StoredRecord[]): MaybePromise<void>;
  /** Notifies when something outside this tab changes the same collection. */
  subscribe?(collection: string, listener: () => void): () => void;
}

export interface Repository<T extends StoredRecord = StoredRecord> {
  list(): T[];
  get(id: string): T | undefined;
  create(input: Omit<T, "id" | "createdAt">): T;
  update(id: string, changes: Partial<Omit<T, "id" | "createdAt">>): T | undefined;
  remove(id: string): boolean;
  replaceAll(records: T[]): void;
  /** Fires whenever the visible collection changes, including from another tab. */
  subscribe(listener: () => void): () => void;
  /** Fires when a write that was already shown was rejected by the store and rolled back. */
  onError(listener: (error: StorageUnavailableError) => void): () => void;
  /** Resolves once the first read and every queued write have settled. For tests and for export. */
  settled(): Promise<void>;
  /** Releases the adapter subscription. */
  dispose(): void;
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

function isPromise<T>(value: MaybePromise<T>): value is Promise<T> {
  return typeof (value as Promise<T>)?.then === "function";
}

export function createRepository<T extends StoredRecord = StoredRecord>(
  collection: string,
  adapter: StorageAdapter,
): Repository<T> {
  const listeners = new Set<() => void>();
  const errorListeners = new Set<(error: StorageUnavailableError) => void>();
  let cache: T[] = [];
  let loaded = false;
  /**
   * Counts local changes. A read that was already in flight when the user
   * changed something is stale by the time it answers, and adopting it would
   * silently undo their edit — so it is dropped instead.
   *
   * The boundary this draws is deliberate and stated in API.md: the repository
   * is local-first and does not merge concurrent remote edits. A store that
   * needs merge semantics supplies an adapter that does the merging, which is
   * the same seam and no change above it.
   */
  let revision = 0;
  /**
   * Writes run one after another. A store that answers out of order — any
   * network one — would otherwise let an older collection overwrite a newer.
   */
  let queue: Promise<void> = Promise.resolve();
  let unsubscribeAdapter: (() => void) | undefined;

  const announce = (): void => {
    for (const listener of [...listeners]) listener();
  };

  const report = (error: unknown): void => {
    const failure = error instanceof StorageUnavailableError ? error : new StorageUnavailableError(error);
    for (const listener of [...errorListeners]) listener(failure);
  };

  const adopt = (records: StoredRecord[]): void => {
    cache = records as T[];
    loaded = true;
    announce();
  };

  const refresh = (): MaybePromise<void> => {
    const at = revision;
    const read = adapter.read(collection);
    if (!isPromise(read)) {
      adopt(read);
      return undefined;
    }
    return read.then(
      (records) => {
        if (revision === at) adopt(records);
        else loaded = true;
      },
      (error) => {
        // A failed read is an empty collection, never a blank screen.
        if (revision === at) adopt([]);
        report(error);
      },
    );
  };

  const initial = refresh();
  if (isPromise(initial)) queue = queue.then(() => initial);

  /**
   * Shows the change immediately, then persists it. If the store rejects, the
   * previous records come back and the rejection is reported — the interface
   * never keeps showing a change that was not stored.
   */
  const persist = (records: T[]): void => {
    const previous = cache;
    revision += 1;
    cache = records;
    loaded = true;
    announce();

    queue = queue.then(async () => {
      try {
        await adapter.write(collection, records);
      } catch (error) {
        if (cache === records) {
          revision += 1;
          cache = previous;
          announce();
        }
        report(error);
      }
    });
  };

  if (adapter.subscribe) {
    unsubscribeAdapter = adapter.subscribe(collection, () => {
      const outcome = refresh();
      if (isPromise(outcome)) queue = queue.then(() => outcome);
    });
  }

  return {
    list: () => [...cache],
    get: (id) => cache.find((record) => record.id === id),
    create(input) {
      const record = { ...input, id: nextId(), createdAt: new Date().toISOString() } as T;
      persist([...cache, record]);
      return record;
    },
    update(id, changes) {
      const index = cache.findIndex((record) => record.id === id);
      if (index < 0) return undefined;
      // `id` and `createdAt` are the kernel's; a caller cannot overwrite them.
      const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safe } = changes as Record<string, unknown>;
      const updated = { ...cache[index], ...safe } as T;
      const next = [...cache];
      next[index] = updated;
      persist(next);
      return updated;
    },
    remove(id) {
      const next = cache.filter((record) => record.id !== id);
      if (next.length === cache.length) return false;
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
    onError(listener) {
      errorListeners.add(listener);
      return () => errorListeners.delete(listener);
    },
    async settled() {
      // The queue grows while it drains; wait until it stops growing.
      let seen: Promise<void> | undefined;
      while (seen !== queue) {
        seen = queue;
        await queue;
      }
      if (!loaded) await Promise.resolve();
    },
    dispose() {
      unsubscribeAdapter?.();
      unsubscribeAdapter = undefined;
      listeners.clear();
      errorListeners.clear();
    },
  };
}
