import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRepository, StorageUnavailableError, type StorageAdapter } from "./repository.js";
import { createMemoryAdapter } from "./memoryAdapter.js";
import { createLocalStorageAdapter } from "./localStorageAdapter.js";

describe("repository", () => {
  it("creates, reads back, updates and removes a record", () => {
    const repository = createRepository("thing", createMemoryAdapter());
    const created = repository.create({ label: "first" });

    expect(repository.list()).toHaveLength(1);
    expect(repository.get(created.id)?.label).toBe("first");

    repository.update(created.id, { label: "second" });
    expect(repository.get(created.id)?.label).toBe("second");

    expect(repository.remove(created.id)).toBe(true);
    expect(repository.list()).toHaveLength(0);
  });

  it("refuses to overwrite kernel-owned fields", () => {
    const repository = createRepository("thing", createMemoryAdapter());
    const created = repository.create({ label: "keep" });

    repository.update(created.id, { id: "hijacked", createdAt: "1999", label: "changed" } as never);

    expect(repository.get(created.id)?.label).toBe("changed");
    expect(repository.get("hijacked")).toBeUndefined();
    expect(repository.get(created.id)?.createdAt).toBe(created.createdAt);
  });

  it("reports removing something that is already gone instead of throwing", () => {
    const repository = createRepository("thing", createMemoryAdapter());
    expect(repository.remove("missing")).toBe(false);
  });

  it("gives every record a distinct id even when created in the same millisecond", () => {
    const repository = createRepository("thing", createMemoryAdapter());
    const ids = Array.from({ length: 50 }, () => repository.create({}).id);
    expect(new Set(ids).size).toBe(50);
  });

  it("rolls a rejected write back and reports it, rather than keeping a change that was not stored", async () => {
    const failing: StorageAdapter = {
      read: () => [],
      write: () => {
        throw new Error("quota exceeded");
      },
    };
    const repository = createRepository("thing", failing);
    const failures: StorageUnavailableError[] = [];
    repository.onError((error) => {
      if (error) failures.push(error);
    });

    // The change is shown first: a store that answers over a network answers late.
    repository.create({ label: "doomed" });
    expect(repository.list()).toHaveLength(1);

    await repository.settled();

    expect(repository.list()).toHaveLength(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toBeInstanceOf(StorageUnavailableError);
  });

  it("rolls multiple rejected queued writes back to the last stored snapshot", async () => {
    const failing: StorageAdapter = {
      read: () => [],
      write: async () => {
        throw new Error("offline");
      },
    };
    const repository = createRepository("thing", failing);
    const failures: StorageUnavailableError[] = [];
    repository.onError((error) => {
      if (error) failures.push(error);
    });

    repository.create({ label: "first" });
    repository.create({ label: "second" });
    expect(repository.list()).toHaveLength(2);

    await repository.settled();

    expect(repository.list()).toEqual([]);
    expect(failures).toHaveLength(2);
  });

  it("keeps the last successful write when a later queued write is rejected", async () => {
    let writes = 0;
    const partlyFailing: StorageAdapter = {
      read: () => [],
      write: async () => {
        writes += 1;
        if (writes === 2) throw new Error("offline");
      },
    };
    const repository = createRepository("thing", partlyFailing);

    repository.create({ label: "stored" });
    repository.create({ label: "rejected" });
    await repository.settled();

    expect(repository.list().map((record) => record.label)).toEqual(["stored"]);
  });

  it("replays an initial read failure to a subscriber that attaches after construction", async () => {
    const failing: StorageAdapter = {
      read: async () => {
        throw new Error("offline");
      },
      write: async () => {},
    };
    const repository = createRepository("thing", failing);
    await repository.settled();
    const failures: StorageUnavailableError[] = [];

    repository.onError((error) => {
      if (error) failures.push(error);
    });

    expect(failures).toHaveLength(1);
    expect(failures[0].operation).toBe("read");
    expect(failures[0].message).toMatch(/could not be loaded/u);
  });

  it("preserves confirmed data across a transient refresh failure and clears the recovered status", () => {
    const stored = [{ id: "a", createdAt: "2026-01-01T00:00:00.000Z", label: "kept" }];
    let failRead = false;
    let refresh = (): void => {};
    const adapter: StorageAdapter = {
      read: () => {
        if (failRead) throw new Error("offline");
        return stored;
      },
      write: () => {},
      subscribe: (_collection, listener) => {
        refresh = listener;
        return () => {};
      },
    };
    const repository = createRepository("thing", adapter);
    const statuses: Array<StorageUnavailableError | null> = [];
    repository.onError((error) => statuses.push(error));

    failRead = true;
    refresh();
    expect(repository.list().map((record) => record.label)).toEqual(["kept"]);
    expect(statuses.at(-1)).toBeInstanceOf(StorageUnavailableError);

    failRead = false;
    refresh();
    expect(repository.list().map((record) => record.label)).toEqual(["kept"]);
    expect(statuses.at(-1)).toBeNull();
  });

  it("reads from a store that answers later, and shows it once it does", async () => {
    const remote: StorageAdapter = {
      read: async () => [{ id: "a", createdAt: "2026-01-01T00:00:00.000Z", label: "from the server" }],
      write: async () => {},
    };
    const repository = createRepository("thing", remote);

    // Nothing to show yet, and no crash for asking.
    expect(repository.list()).toEqual([]);

    await repository.settled();

    expect(repository.list()).toHaveLength(1);
    expect(repository.list()[0].label).toBe("from the server");
  });

  it("keeps queued writes in order when the store answers out of order", async () => {
    const written: string[][] = [];
    let delay = 30;
    const remote: StorageAdapter = {
      read: () => [],
      write: async (_collection, records) => {
        // Each write resolves faster than the one before it.
        delay = Math.max(0, delay - 15);
        await new Promise((resolve) => setTimeout(resolve, delay));
        written.push(records.map((record) => String(record.label)));
      },
    };
    const repository = createRepository("thing", remote);

    repository.create({ label: "first" });
    repository.create({ label: "second" });
    repository.create({ label: "third" });
    await repository.settled();

    expect(written).toEqual([["first"], ["first", "second"], ["first", "second", "third"]]);
  });

  it("notifies subscribers on every change", () => {
    const repository = createRepository("thing", createMemoryAdapter());
    const listener = vi.fn();
    const stop = repository.subscribe(listener);

    const created = repository.create({ label: "a" });
    repository.update(created.id, { label: "b" });
    repository.remove(created.id);

    expect(listener).toHaveBeenCalledTimes(3);
    stop();
    repository.create({ label: "c" });
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe("localStorage adapter", () => {
  beforeEach(() => window.localStorage.clear());

  it("round-trips records through storage", () => {
    const adapter = createLocalStorageAdapter("test");
    adapter.write("thing", [{ id: "1", createdAt: "2026-01-01T00:00:00.000Z", label: "kept" }]);
    expect(adapter.read("thing")).toEqual([{ id: "1", createdAt: "2026-01-01T00:00:00.000Z", label: "kept" }]);
  });

  it("recovers from unparseable stored data", () => {
    window.localStorage.setItem("test:thing", "{ not json");
    expect(createLocalStorageAdapter("test").read("thing")).toEqual([]);
  });

  it("drops entries that are not usable records and de-duplicates ids", async () => {
    window.localStorage.setItem(
      "test:thing",
      JSON.stringify([{ id: "1" }, "nonsense", null, { noId: true }, { id: "1", label: "duplicate" }]),
    );
    // `read` may answer later; awaiting is how a caller treats every adapter.
    const records = await createLocalStorageAdapter("test").read("thing");
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe("1");
  });

  it("reports rather than swallows an unavailable store", () => {
    const blocked = {
      getItem: () => null,
      setItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    expect(() => createLocalStorageAdapter("test", blocked).write("thing", [])).toThrow();
  });

  it("reports an unavailable store read", () => {
    const blocked = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {},
    } as unknown as Storage;
    expect(() => createLocalStorageAdapter("test", blocked).read("thing")).toThrow(/could not be read/u);
  });

  it("notifies a subscriber when another tab writes the same key", () => {
    const adapter = createLocalStorageAdapter("test");
    const listener = vi.fn();
    const stop = adapter.subscribe!("thing", listener);

    window.dispatchEvent(new StorageEvent("storage", { key: "test:thing" }));
    expect(listener).toHaveBeenCalledTimes(1);

    stop();
    window.dispatchEvent(new StorageEvent("storage", { key: "test:thing" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("notifies on a whole-storage clear (key: null) but not on an unrelated key", () => {
    const adapter = createLocalStorageAdapter("test");
    const listener = vi.fn();
    adapter.subscribe!("thing", listener);

    window.dispatchEvent(new StorageEvent("storage", { key: null }));
    expect(listener).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new StorageEvent("storage", { key: "test:other" }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("repository picks up a same-key change made by another tab", () => {
    const repository = createRepository("thing", createLocalStorageAdapter("test"));
    const listener = vi.fn();
    repository.subscribe(listener);
    expect(repository.list()).toHaveLength(0);

    // Simulates another tab's write: same key, this tab's own storage event.
    window.localStorage.setItem(
      "test:thing",
      JSON.stringify([{ id: "1", createdAt: "2026-01-01T00:00:00.000Z", label: "from another tab" }]),
    );
    window.dispatchEvent(new StorageEvent("storage", { key: "test:thing" }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(repository.list()).toEqual([{ id: "1", createdAt: "2026-01-01T00:00:00.000Z", label: "from another tab" }]);
  });
});
