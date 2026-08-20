import { describe, expect, it } from "vitest";
import { shellLayout, validateParameters } from "./config.js";
import parameters from "../../parameters.json";

const valid = {
  route: "web-app",
  product: { name: "Thing", tagline: "Does a thing" },
  theme: { preset: "modern-minimalist" },
  navigation: [{ id: "all", label: "All", kind: "collection", entity: "item" }],
  entities: [{ name: "item", label: "Item", labelPlural: "Items", fields: [{ name: "title", label: "Title", type: "text" }] }],
  features: {},
  persistence: { adapter: "localStorage", namespace: "thing" },
};

describe("parameters validation", () => {
  it("accepts the committed default parameters", () => {
    expect(validateParameters(parameters)).toEqual([]);
  });

  it("accepts a minimal valid configuration", () => {
    expect(validateParameters(valid)).toEqual([]);
  });

  it("reports every problem at once rather than only the first", () => {
    const problems = validateParameters({ ...valid, route: "nope", entities: [], theme: { preset: "unknown" } });
    expect(problems.length).toBeGreaterThan(2);
    expect(problems.join(" ")).toContain("route must be one of");
  });

  it("rejects a navigation entry pointing at an entity that does not exist", () => {
    const problems = validateParameters({
      ...valid,
      navigation: [{ id: "all", label: "All", kind: "collection", entity: "ghost" }],
    });
    expect(problems.join(" ")).toContain("ghost");
  });

  it("rejects anything that is not an object", () => {
    expect(validateParameters(null)).toHaveLength(1);
    expect(validateParameters([])).toHaveLength(1);
  });
});

describe("shell layout", () => {
  const entry = (id: string) => ({ id, label: id, kind: "collection" as const });

  it("drops navigation entirely for a single view", () => {
    expect(shellLayout([entry("a")])).toBe("single");
  });

  it("uses a bar for two to four views and a sidebar beyond that", () => {
    expect(shellLayout([entry("a"), entry("b")])).toBe("bar");
    expect(shellLayout(["a", "b", "c", "d"].map(entry))).toBe("bar");
    expect(shellLayout(["a", "b", "c", "d", "e"].map(entry))).toBe("sidebar");
  });
});
