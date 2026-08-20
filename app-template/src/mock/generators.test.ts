import { describe, expect, it } from "vitest";
import { categorical, groupByField, pointsForPlot, seededRandom, timeseries } from "./generators.js";
import type { PlotSpec, StoredRecord } from "../kernel/types.js";

describe("seeded generators", () => {
  it("produces identical output for the same seed", () => {
    expect(timeseries(10, 42)).toEqual(timeseries(10, 42));
    expect(categorical(["A", "B"], 5)).toEqual(categorical(["A", "B"], 5));
  });

  it("produces different output for different seeds", () => {
    expect(timeseries(10, 1)).not.toEqual(timeseries(10, 2));
  });

  it("stays within the unit interval", () => {
    const random = seededRandom(9);
    for (let index = 0; index < 100; index += 1) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("never produces a negative series value", () => {
    expect(timeseries(60, 3, "down").every((point) => point.value >= 0)).toBe(true);
  });
});

describe("grouping real records", () => {
  const records: StoredRecord[] = [
    { id: "1", createdAt: "", kind: "A" },
    { id: "2", createdAt: "", kind: "A" },
    { id: "3", createdAt: "", kind: "B" },
    { id: "4", createdAt: "" },
  ];

  it("counts per distinct value, largest first", () => {
    expect(groupByField(records, "kind")).toEqual([
      { label: "A", value: 2 },
      { label: "B", value: 1 },
      { label: "Unspecified", value: 1 },
    ]);
  });

  it("resolves an entity-backed plot from the real records", () => {
    const plot: PlotSpec = { id: "p", title: "By kind", kind: "bar", source: { kind: "entityGroup", field: "kind" } };
    expect(pointsForPlot(plot, records)).toHaveLength(3);
  });

  it("returns no points when a plot names no field to group by", () => {
    const plot: PlotSpec = { id: "p", title: "Broken", kind: "bar", source: { kind: "entityGroup" } };
    expect(pointsForPlot(plot, records)).toEqual([]);
  });
});
