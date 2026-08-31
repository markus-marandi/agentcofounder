import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { validateParametersFile } from "../src/validate-parameters.js";

const temporaryDirectories: string[] = [];
const schemaPath = path.resolve("app-template", "parameters.schema.json");

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

async function write(parameters: unknown): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-parameters-"));
  temporaryDirectories.push(root);
  const target = path.join(root, "parameters.json");
  await writeFile(target, JSON.stringify(parameters), "utf8");
  return target;
}

const valid = {
  route: "web-app",
  product: { name: "Thing", tagline: "Does a thing" },
  theme: { preset: "modern-minimalist" },
  navigation: [{ id: "all", label: "All", kind: "collection", entity: "item" }],
  entities: [
    { name: "item", label: "Item", labelPlural: "Items", fields: [{ name: "title", label: "Title", type: "text" }] },
  ],
  features: { search: true },
  persistence: { adapter: "localStorage", namespace: "thing" },
};

describe("parameters schema", () => {
  it("accepts the committed seed", async () => {
    expect(await validateParametersFile(path.resolve("app-template", "parameters.json"), schemaPath)).toEqual([]);
  });

  it("accepts a minimal valid configuration", async () => {
    expect(await validateParametersFile(await write(valid), schemaPath)).toEqual([]);
  });

  it("rejects an unknown route", async () => {
    const problems = await validateParametersFile(await write({ ...valid, route: "something-else" }), schemaPath);
    expect(problems.join(" ")).toContain("/route");
  });

  it("accepts the kernel's overdue condition mode", async () => {
    const baseEntity = valid.entities[0]!;
    const entity = {
      ...baseEntity,
      fields: [...baseEntity.fields, { name: "dueBack", label: "Due back", type: "date" }],
      filters: [{ field: "dueBack", label: "Overdue", mode: "beforeToday" }],
      derived: [
        {
          id: "overdue",
          label: "Overdue",
          kind: "countWhere",
          where: { field: "dueBack", mode: "beforeToday" },
        },
      ],
    };
    expect(await validateParametersFile(await write({ ...valid, entities: [entity] }), schemaPath)).toEqual([]);
  });

  it("rejects a dashboard that does not have exactly four supporting plots", async () => {
    const plot = { id: "p", title: "P", kind: "bar", source: { kind: "entityCount" } };
    const problems = await validateParametersFile(
      await write({ ...valid, dashboard: { main: plot, sub: [plot, plot] } }),
      schemaPath,
    );
    expect(problems.join(" ")).toContain("/dashboard/sub");
  });

  it("rejects an application with no entities", async () => {
    const problems = await validateParametersFile(await write({ ...valid, entities: [] }), schemaPath);
    expect(problems.join(" ")).toContain("/entities");
  });

  it("rejects a misspelled top-level key rather than ignoring it", async () => {
    const problems = await validateParametersFile(await write({ ...valid, feature: {} }), schemaPath);
    expect(problems.join(" ")).toContain("additional properties");
  });
});
