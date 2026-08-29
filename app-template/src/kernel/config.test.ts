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

  it("rejects a filter, derived value, action, or sort naming a field nobody declared", () => {
    const entity = {
      name: "item",
      label: "Item",
      labelPlural: "Items",
      fields: [{ name: "title", label: "Title", type: "text" }],
      filters: [{ field: "ghost", label: "Ghost" }],
      derived: [{ id: "d", label: "D", kind: "sum", field: "phantom" }],
      actions: [{ id: "a", label: "A", sets: { spectre: true }, when: { field: "wraith", mode: "truthy" } }],
      sort: { field: "shade" },
    };
    const problems = validateParameters({ ...valid, entities: [entity] }).join(" ");
    for (const name of ["ghost", "phantom", "spectre", "wraith", "shade"]) {
      expect(problems).toContain(name);
    }
  });

  it("accepts a field name the kernel supplies rather than the entity", () => {
    const entity = {
      ...valid.entities[0],
      sort: { field: "createdAt", direction: "desc" },
    };
    expect(validateParameters({ ...valid, entities: [entity] })).toEqual([]);
  });

  it("rejects an action that would do nothing and a repeated action id", () => {
    const entity = {
      ...valid.entities[0],
      actions: [
        { id: "a", label: "A" },
        { id: "a", label: "Again", sets: { title: "x" } },
      ],
    };
    const problems = validateParameters({ ...valid, entities: [entity] }).join(" ");
    expect(problems).toContain("does nothing");
    expect(problems).toContain('repeats the action id "a"');
  });

  it("rejects a select with no options and an unknown field type", () => {
    const entity = {
      ...valid.entities[0],
      fields: [
        { name: "title", label: "Title", type: "text" },
        { name: "kind", label: "Kind", type: "select" },
        { name: "odd", label: "Odd", type: "colour" },
      ],
    };
    const problems = validateParameters({ ...valid, entities: [entity] }).join(" ");
    expect(problems).toContain("non-empty options list");
    expect(problems).toContain("must be one of: text");
  });

  it("accepts a combobox with options, which are suggestions rather than a closed set", () => {
    const entity = {
      ...valid.entities[0],
      fields: [{ name: "kind", label: "Kind", type: "combobox", options: ["Novel"] }],
    };
    expect(validateParameters({ ...valid, entities: [entity] })).toEqual([]);
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
