import { expect, it } from "vitest";
import { createRepository, type StorageAdapter } from "./repository.js";

/**
 * The contract every `StorageAdapter` has to satisfy — the thing that makes
 * "swap in a database and nothing above changes" checkable rather than a claim
 * in a README.
 *
 * `adapterContract.test.ts` runs it against all three shipped adapters: the
 * in-memory one, the localStorage one, and the HTTP one against a stub server.
 * A fourth adapter — Postgres, S3, a REST service, a company's own API — is
 * ready for this app exactly when it passes this suite. Nothing else in the app
 * needs to be consulted.
 *
 * The contract is deliberately small. It says nothing about latency, ordering
 * inside a store, or transport: the repository absorbs all three.
 */
export interface AdapterUnderTest {
  /** A fresh, empty adapter. Called once per test. */
  create(): StorageAdapter | Promise<StorageAdapter>;
  /** Set when the adapter cannot be made to reject a write in a test. */
  skipRejection?: boolean;
}

const sample = (label: string) => ({ label });

export function adapterContract({ create, skipRejection = false }: AdapterUnderTest): void {
  it("starts empty and never throws on a first read", async () => {
    const repository = createRepository("contract", await create());
    await repository.settled();
    expect(repository.list()).toEqual([]);
  });

  it("returns what it stored, through a fresh repository over the same adapter", async () => {
    const adapter = await create();
    const first = createRepository("contract", adapter);
    first.create(sample("kept"));
    await first.settled();

    // A second repository stands in for a page reload against the same store.
    const second = createRepository("contract", adapter);
    await second.settled();

    expect(second.list().map((record) => record.label)).toEqual(["kept"]);
  });

  it("gives every stored record an id and a createdAt", async () => {
    const repository = createRepository("contract", await create());
    repository.create(sample("stamped"));
    await repository.settled();

    const [record] = repository.list();
    expect(typeof record.id).toBe("string");
    expect(record.id).not.toBe("");
    expect(Number.isNaN(Date.parse(record.createdAt))).toBe(false);
  });

  it("keeps collections apart", async () => {
    const adapter = await create();
    const left = createRepository("contract", adapter);
    const right = createRepository("other", adapter);
    left.create(sample("mine"));
    await left.settled();
    await right.settled();

    expect(left.list()).toHaveLength(1);
    expect(right.list()).toHaveLength(0);
  });

  it("updates and removes, and reports a miss rather than inventing a record", async () => {
    const repository = createRepository("contract", await create());
    const record = repository.create(sample("before"));
    await repository.settled();

    expect(repository.update(record.id, { label: "after" })?.label).toBe("after");
    expect(repository.update("nobody", { label: "x" })).toBeUndefined();
    expect(repository.remove("nobody")).toBe(false);
    expect(repository.remove(record.id)).toBe(true);
    await repository.settled();

    expect(repository.list()).toEqual([]);
  });

  it("refuses to let a caller overwrite the kernel's id or createdAt", async () => {
    const repository = createRepository("contract", await create());
    const record = repository.create(sample("fixed"));
    await repository.settled();

    repository.update(record.id, { id: "hijacked", createdAt: "1999-01-01" } as never);
    await repository.settled();

    expect(repository.list()[0].id).toBe(record.id);
    expect(repository.list()[0].createdAt).toBe(record.createdAt);
  });

  it.skipIf(skipRejection)("rolls back and reports when the store rejects a write", async () => {
    const adapter = await create();
    const failures: Error[] = [];
    const rejecting: StorageAdapter = {
      read: (collection) => adapter.read(collection),
      write: () => {
        throw new Error("rejected by the store");
      },
    };
    const repository = createRepository("contract", rejecting);
    repository.onError((error) => failures.push(error));
    await repository.settled();

    repository.create(sample("doomed"));
    expect(repository.list()).toHaveLength(1); // shown first

    await repository.settled();

    expect(repository.list()).toHaveLength(0); // then taken back
    expect(failures).toHaveLength(1);
  });
}
