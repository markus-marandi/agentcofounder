import type { PlotSpec, StoredRecord } from "../kernel/types.js";
import { computeDerived } from "../data/operations.js";

/**
 * Deterministic demonstration data. Seeded so a chart looks the same on every
 * reload and in every test run — random data would make snapshots and derived
 * values impossible to assert.
 */

export interface Point {
  label: string;
  value: number;
}

/** Mulberry32: small, fast, and stable across platforms. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TREND_STEP = { up: 1.6, down: -1.6, flat: 0, volatile: 0 } as const;

export function timeseries(points: number, seed: number, trend: PlotSpec["source"]["trend"] = "up"): Point[] {
  const random = seededRandom(seed);
  const drift = TREND_STEP[trend ?? "up"];
  const jitter = trend === "volatile" ? 22 : 8;
  let value = 50;
  const today = new Date(Date.UTC(2026, 0, 1));
  return Array.from({ length: points }, (_unused, index) => {
    value = Math.max(0, value + drift + (random() - 0.5) * jitter);
    const date = new Date(today.getTime() + index * 86_400_000);
    return { label: date.toISOString().slice(0, 10), value: Math.round(value * 10) / 10 };
  });
}

export function categorical(categories: string[], seed: number): Point[] {
  const random = seededRandom(seed);
  return categories.map((label) => ({ label, value: Math.round(random() * 90) + 10 }));
}

/** Counts records per distinct value of a field — real data, not invented. */
export function groupByField(records: StoredRecord[], field: string): Point[] {
  const counts = new Map<string, number>();
  for (const record of records) {
    const key = String(record[field] ?? "Unspecified") || "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/**
 * Resolves a plot's declared source. Sources beginning `entity` read the real
 * store; `timeseries` and `categorical` produce seeded demonstration data, and
 * a view should label them as illustrative.
 */
export function pointsForPlot(plot: PlotSpec, records: StoredRecord[]): Point[] {
  const { source } = plot;
  switch (source.kind) {
    case "timeseries":
      return timeseries(source.points ?? 30, source.seed ?? 7, source.trend);
    case "categorical":
      return categorical(source.categories ?? ["A", "B", "C", "D"], source.seed ?? 11);
    case "entityGroup":
      return source.field ? groupByField(records, source.field) : [];
    case "entityCount":
      return [{ label: "Total", value: records.length }];
    case "entitySum": {
      const total = computeDerived({ id: "sum", label: "Sum", kind: "sum", field: source.field }, records);
      return [{ label: "Total", value: total ?? 0 }];
    }
    default:
      return [];
  }
}

export function isIllustrative(plot: PlotSpec): boolean {
  return plot.source.kind === "timeseries" || plot.source.kind === "categorical";
}
