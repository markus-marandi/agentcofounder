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
  /** Every record for a collection. May reject when the store cannot be read. */
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
  replaceAll(records: T[]): Promise<void>;
  /** Fires whenever the visible collection changes, including from another tab. */
  subscribe(listener: () => void): () => void;
  /** Reports a storage failure, then `null` once a later operation proves recovery. */
  onError(listener: (error: StorageUnavailableError | null) => void): () => void;
  /** Resolves once the first read and every queued write have settled. For tests and for export. */
  settled(): Promise<void>;
  /** Releases the adapter subscription. */
  dispose(): void;
}

export class StorageUnavailableError extends Error {
  readonly operation: "read" | "write";

  constructor(cause: unknown, operation: "read" | "write" = "write") {
    super(
      operation === "read"
        ? "Saved data could not be loaded. Check this browser's storage or your connection before making changes."
        : "Changes could not be saved. This browser is blocking or is out of storage.",
    );
    this.name = "StorageUnavailableError";
    this.cause = cause;
    this.operation = operation;
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
  const errorListeners = new Set<(error: StorageUnavailableError | null) => void>();
  let cache: T[] = [];
  let committed: T[] = [];
  let loaded = false;
  let lastError: StorageUnavailableError | null = null;
  let pendingWrites = 0;
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

  const report = (error: unknown, operation: "read" | "write"): StorageUnavailableError => {
    const failure =
      error instanceof StorageUnavailableError ? error : new StorageUnavailableError(error, operation);
    lastError = failure;
    for (const listener of [...errorListeners]) listener(failure);
    return failure;
  };

  const clearError = (): void => {
    if (!lastError) return;
    lastError = null;
    for (const listener of [...errorListeners]) listener(null);
  };

  const adopt = (records: StoredRecord[]): void => {
    cache = records as T[];
    committed = cache;
    loaded = true;
    clearError();
    announce();
  };

  const refresh = (): MaybePromise<void> => {
    const at = revision;
    let read: MaybePromise<StoredRecord[]>;
    try {
      read = adapter.read(collection);
    } catch (error) {
      if (revision === at && !loaded) adopt([]);
      report(error, "read");
      return undefined;
    }
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
        // An initial failed read starts empty. A later transient failure must
        // preserve the last confirmed snapshot rather than erase good data.
        if (revision === at && !loaded) adopt([]);
        report(error, "read");
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
  const persist = (records: T[]): Promise<void> => {
    revision += 1;
    cache = records;
    loaded = true;
    pendingWrites += 1;
    announce();

    const operation = queue.then(async () => {
      try {
        await adapter.write(collection, records);
        committed = records;
        clearError();
      } catch (error) {
        throw report(error, "write");
      } finally {
        pendingWrites -= 1;
        if (pendingWrites === 0 && cache !== committed) {
          revision += 1;
          cache = committed;
          announce();
        }
      }
    });
    // Keep the serialization chain usable after a rejection. Callers that need
    // confirmation (notably import) receive `operation`; ordinary optimistic
    // writes are reported through onError without creating an unhandled promise.
    queue = operation.catch(() => undefined);
    return operation;
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
      return persist([...records]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onError(listener) {
      errorListeners.add(listener);
      if (lastError) listener(lastError);
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
