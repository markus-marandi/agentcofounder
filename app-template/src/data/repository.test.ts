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

  it("surfaces a failed write and keeps the last good state", () => {
    const failing: StorageAdapter = {
      read: () => [],
      write: () => {
        throw new Error("quota exceeded");
      },
    };
    const repository = createRepository("thing", failing);

    expect(() => repository.create({ label: "doomed" })).toThrow(StorageUnavailableError);
    expect(repository.list()).toHaveLength(0);
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

  it("drops entries that are not usable records and de-duplicates ids", () => {
    window.localStorage.setItem(
      "test:thing",
      JSON.stringify([{ id: "1" }, "nonsense", null, { noId: true }, { id: "1", label: "duplicate" }]),
    );
    const records = createLocalStorageAdapter("test").read("thing");
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
});
