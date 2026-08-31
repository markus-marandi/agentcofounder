import { describe, expect, it } from "vitest";
import { createRepository } from "./repository.js";
import { createMemoryAdapter } from "./memoryAdapter.js";
import {
  EXPORT_FORMAT_VERSION,
  ImportFormatError,
  exportCollections,
  importCollections,
  readExport,
} from "./portability.js";

function seeded() {
  const adapter = createMemoryAdapter();
  const books = createRepository("book", adapter);
  const people = createRepository("person", adapter);
  books.create({ title: "Dune" });
  books.create({ title: "Emma" });
  people.create({ name: "Ada" });
  return { books, people, repositories: { book: books, person: people } };
}

describe("portability", () => {
  it("exports every collection with its records", () => {
    const { repositories } = seeded();

    const data = exportCollections(repositories);

    expect(data.version).toBe(EXPORT_FORMAT_VERSION);
    expect(data.collections.book.map((record) => record.title)).toEqual(["Dune", "Emma"]);
    expect(data.collections.person).toHaveLength(1);
    expect(Number.isNaN(Date.parse(data.exportedAt))).toBe(false);
  });

  it("round-trips through JSON into a different store", async () => {
    const { repositories } = seeded();
    const raw = JSON.stringify(exportCollections(repositories));

    // A second app, a different adapter — the case a migration actually is.
    const elsewhere = createMemoryAdapter();
    const books = createRepository("book", elsewhere);
    const applied = importCollections(readExport(raw), { book: books });
    await books.settled();

    expect(applied).toEqual({ book: 2 });
    expect(books.list().map((record) => record.title)).toEqual(["Dune", "Emma"]);
  });

  it("ignores a collection the receiving app does not have", () => {
    const { repositories } = seeded();
    const raw = JSON.stringify(exportCollections(repositories));
    const books = createRepository("book", createMemoryAdapter());

    expect(importCollections(readExport(raw), { book: books })).toEqual({ book: 2 });
  });

  it("drops a malformed record rather than importing it", () => {
    const raw = JSON.stringify({
      format: "agent-cofounder-app/export",
      version: 1,
      exportedAt: new Date().toISOString(),
      collections: { book: [{ id: "keeps", title: "Kept" }, { title: "no id" }, "not an object"] },
    });

    expect(readExport(raw).collections.book).toHaveLength(1);
  });

  it("refuses a file that is not an export from this app", () => {
    expect(() => readExport("not json")).toThrow(ImportFormatError);
    expect(() => readExport(JSON.stringify({ hello: true }))).toThrow(ImportFormatError);
    expect(() =>
      readExport(JSON.stringify({ format: "agent-cofounder-app/export", version: 99, collections: {} })),
    ).toThrow(/newer version/u);
  });
});
