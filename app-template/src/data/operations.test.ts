import { describe, expect, it } from "vitest";
import { applyFilters, computeDerived, formatDerived, toRecordInput, validateDraft } from "./operations.js";
import { searchRecords } from "./searchIndex.js";
import type { EntitySpec, StoredRecord } from "../kernel/types.js";

const entity: EntitySpec = {
  name: "item",
  label: "Item",
  labelPlural: "Items",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true, unique: true },
    { name: "kind", label: "Kind", type: "select", options: ["A", "B"] },
    { name: "amount", label: "Amount", type: "number", min: 0, max: 10 },
    { name: "done", label: "Done", type: "boolean" },
  ],
};

const records: StoredRecord[] = [
  { id: "1", createdAt: "2026-01-01T00:00:00.000Z", title: "Alpha", kind: "A", amount: 2, done: true },
  { id: "2", createdAt: "2026-01-02T00:00:00.000Z", title: "Beta", kind: "B", amount: 4, done: false },
  { id: "3", createdAt: "2026-01-03T00:00:00.000Z", title: "Gamma", kind: "A", amount: 6, done: false },
];

describe("validation", () => {
  it("requires fields marked required", () => {
    const errors = validateDraft(entity, { title: "", kind: "", amount: null, done: false });
    expect(errors.title).toContain("required");
  });

  it("rejects numbers outside the declared range", () => {
    expect(validateDraft(entity, { title: "x", kind: "", amount: -1, done: false }).amount).toContain("below");
    expect(validateDraft(entity, { title: "x", kind: "", amount: 99, done: false }).amount).toContain("above");
  });

  it("rejects a select value that is not an option", () => {
    expect(validateDraft(entity, { title: "x", kind: "Z", amount: null, done: false }).kind).toContain("one of");
  });

  it("blocks a duplicate unique value but lets a record keep its own", () => {
    expect(validateDraft(entity, { title: "Alpha", kind: "", amount: null, done: false }, records).title).toContain(
      "already exists",
    );
    expect(validateDraft(entity, { title: "Alpha", kind: "", amount: null, done: false }, records, "1").title).toBeUndefined();
  });

  it("accepts a valid draft and normalises its values", () => {
    const draft = { title: "  Delta  ", kind: "A", amount: 3, done: true };
    expect(validateDraft(entity, draft, records)).toEqual({});
    expect(toRecordInput(entity, draft)).toEqual({ title: "Delta", kind: "A", amount: 3, done: true });
  });

  it("stores an empty number as null rather than zero", () => {
    expect(toRecordInput(entity, { title: "x", kind: "", amount: null, done: false }).amount).toBeNull();
  });
});

describe("filters", () => {
  it("returns everything when nothing is active", () => {
    expect(applyFilters(records, [])).toHaveLength(3);
  });

  it("narrows by equality and by truthiness", () => {
    expect(applyFilters(records, [{ field: "kind", mode: "equals", value: "A" }])).toHaveLength(2);
    expect(applyFilters(records, [{ field: "done", mode: "truthy" }])).toHaveLength(1);
    expect(applyFilters(records, [{ field: "done", mode: "falsy" }])).toHaveLength(2);
  });

  it("combines filters as an intersection", () => {
    const narrowed = applyFilters(records, [
      { field: "kind", mode: "equals", value: "A" },
      { field: "done", mode: "falsy" },
    ]);
    expect(narrowed.map((record) => record.id)).toEqual(["3"]);
  });
});

describe("derived values", () => {
  it("counts, sums, averages and finds extremes", () => {
    expect(computeDerived({ id: "c", label: "Count", kind: "count" }, records)).toBe(3);
    expect(computeDerived({ id: "s", label: "Sum", kind: "sum", field: "amount" }, records)).toBe(12);
    expect(computeDerived({ id: "a", label: "Avg", kind: "average", field: "amount" }, records)).toBe(4);
    expect(computeDerived({ id: "m", label: "Max", kind: "max", field: "amount" }, records)).toBe(6);
    expect(computeDerived({ id: "d", label: "Kinds", kind: "distinct", field: "kind" }, records)).toBe(2);
  });

  it("counts a subset matching a condition", () => {
    const spec = { id: "o", label: "Open", kind: "countWhere" as const, where: { field: "done", mode: "falsy" as const } };
    expect(computeDerived(spec, records)).toBe(2);
  });

  it("reports no value rather than zero when there is nothing to average", () => {
    expect(computeDerived({ id: "a", label: "Avg", kind: "average", field: "amount" }, [])).toBeNull();
    expect(formatDerived(null)).toBe("—");
  });
});

describe("search", () => {
  it("matches across fields and requires every term", () => {
    expect(searchRecords(entity, records, "alpha")).toHaveLength(1);
    expect(searchRecords(entity, records, "alpha zzz")).toHaveLength(0);
    expect(searchRecords(entity, records, "   ")).toHaveLength(3);
  });
});
