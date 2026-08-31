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
    repository.onError((error) => failures.push(error));

    // The change is shown first: a store that answers over a network answers late.
    repository.create({ label: "doomed" });
    expect(repository.list()).toHaveLength(1);

    await repository.settled();

    expect(repository.list()).toHaveLength(0);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toBeInstanceOf(StorageUnavailableError);
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
