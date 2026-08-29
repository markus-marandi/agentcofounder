import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  compileParameters,
  deterministicPartialResult,
  parseProductDecision,
  PRODUCT_DECISION_SYSTEM_PROMPT,
  renderApiDocumentation,
} from "../src/product-decision.js";
import { validateParametersFile } from "../src/validate-parameters.js";

const validDecision = {
  name: "Shelf Ledger",
  tagline: "Know which books are home and which are borrowed.",
  entity: {
    name: "book",
    singular: "Book",
    plural: "Books",
    titleField: "title",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "author", label: "Author", type: "text", required: true },
      { name: "category", label: "Category", type: "select", required: true, options: ["Novel", "Cookbook", "Reference"] },
      { name: "borrower", label: "Borrower", type: "text", required: false },
    ],
  },
  filters: [
    { field: "category", label: "Category", mode: "equals" },
    { field: "borrower", label: "Currently lent", mode: "truthy" },
  ],
  derived: [
    { id: "lent-out", label: "Lent out", kind: "countWhere", where: { field: "borrower", mode: "truthy" } },
  ],
  theme: "forest-canopy",
  search: true,
  namespace: "shelf-ledger",
  assumptions: ["Category is a fixed choice because the examples describe a small stable set."],
  limitations: [],
};

describe("product decision", () => {
  it("expands the compact model wire format into the validated internal decision", () => {
    const compact = {
      p: "Shelf Ledger",
      t: "Know which books are home and which are borrowed.",
      e: {
        s: "Book",
        p: "Books",
        h: "title",
        f: [
          ["title", "Title", "text", 1],
          ["category", "Category", "select", 1, ["Novel", "Reference"]],
        ],
      },
      q: [["category", "Category", "equals"]],
      d: [["Total", "count"]],
      a: "Categories are a fixed set for this first version.",
      l: [],
    };
    const parsed = parseProductDecision(JSON.stringify(compact));
    expect(parsed).toMatchObject({
      name: "Shelf Ledger",
      namespace: "shelf-ledger",
      search: true,
      entity: { name: "book", titleField: "title" },
      assumptions: ["Categories are a fixed set for this first version."],
    });
    expect(parsed.entity.fields[1]?.options).toEqual(["Novel", "Reference"]);
  });

  it("parses the compact decision and tolerates a fenced response", () => {
    const parsed = parseProductDecision(`\`\`\`json\n${JSON.stringify(validDecision)}\n\`\`\``);
    expect(parsed.entity.name).toBe("book");
    expect(parsed.filters).toHaveLength(2);
  });

  it("rejects references to undeclared fields", () => {
    const invalid = structuredClone(validDecision);
    invalid.filters[0]!.field = "missing";
    expect(() => parseProductDecision(JSON.stringify(invalid))).toThrow(/must reference a field/u);
  });

  it("rejects selects without options", () => {
    const invalid = structuredClone(validDecision);
    delete invalid.entity.fields[2]!.options;
    expect(() => parseProductDecision(JSON.stringify(invalid))).toThrow(/options are required/u);
  });

  it("compiles the only supported route and adds browser-storage limitations", () => {
    const decision = parseProductDecision(JSON.stringify(validDecision));
    const parameters = compileParameters(decision) as {
      route: string;
      navigation: Array<{ kind: string; entity: string }>;
      features: { limitations: string[] };
      showcase: { blocks: string[] };
    };
    expect(parameters.route).toBe("web-app");
    expect(parameters.navigation).toEqual([
      { id: "showcase", label: "Home", kind: "showcase" },
      { id: "collection", label: "Books", kind: "collection", entity: "book" },
    ]);
    expect(parameters.showcase.blocks).toEqual(["home-screen-sidebar"]);
    expect(parameters.features.limitations).toHaveLength(2);
  });

  it("compiles a decision that passes the locked parameter schema", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-decision-"));
    const parameterPath = path.join(directory, "parameters.json");
    try {
      await writeFile(parameterPath, JSON.stringify(compileParameters(parseProductDecision(JSON.stringify(validDecision)))), "utf8");
      expect(
        await validateParametersFile(parameterPath, path.resolve("app-template", "parameters.schema.json")),
      ).toEqual([]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("generates API and journey evidence without model-authored files", () => {
    const decision = parseProductDecision(JSON.stringify(validDecision));
    expect(renderApiDocumentation(decision)).toContain("| `borrower` | Borrower | text | no |");
    const report = deterministicPartialResult(decision, true);
    expect(report.status).toBe("success");
    expect(report.tests_run.length).toBeGreaterThanOrEqual(7);
    expect(report.tests_run.every((entry) => entry.result === "passed")).toBe(true);
  });

  it("keeps the entire participant system prompt below 900 characters", () => {
    expect(PRODUCT_DECISION_SYSTEM_PROMPT.length).toBeLessThan(900);
    expect(PRODUCT_DECISION_SYSTEM_PROMPT).not.toMatch(/run npm|read AGENTS|write tests/iu);
    const example = PRODUCT_DECISION_SYSTEM_PROMPT.split("\n")[1] ?? "";
    expect(() => parseProductDecision(example)).not.toThrow();
  });
});
