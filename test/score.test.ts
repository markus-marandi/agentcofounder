import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildScorecard, efficiencyFrom, staticChecks } from "../src/score.js";
import type { RunResult } from "../src/types.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

async function scaffold(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-score-"));
  temporaryDirectories.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(root, relative);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, "utf8");
  }
  return root;
}

function failing(checks: Awaited<ReturnType<typeof staticChecks>>): string[] {
  return checks.filter((entry) => !entry.passed).map((entry) => entry.id);
}

describe("static checks", () => {
  it("passes every structural check for the committed seed", async () => {
    const checks = await staticChecks(path.resolve("app-template"));
    expect(failing(checks)).toEqual([]);
  });

  it("reports an application that has nothing at all", async () => {
    const checks = await staticChecks(await scaffold({ "src/App.tsx": "export function App() { return null; }" }));
    expect(failing(checks).length).toBeGreaterThan(8);
  });

  it("flags a component that reaches storage directly", async () => {
    const root = await scaffold({
      "src/ui/Leaky.tsx": "export const value = localStorage.getItem('x');",
      "src/data/store.ts": "export const nothing = 0;",
    });
    const checks = await staticChecks(root);
    expect(failing(checks)).toContain("storage-not-in-components");
  });

  it("does not flag a test that clears storage while setting up", async () => {
    const root = await scaffold({
      "src/ui/View.test.tsx": "beforeEach(() => window.localStorage.clear());",
      "src/ui/View.tsx": "export function View() { return null; }",
    });
    const checks = await staticChecks(root);
    expect(failing(checks)).not.toContain("storage-not-in-components");
  });

  it("flags a suite that leaves a test skipped", async () => {
    const root = await scaffold({ "src/a.test.ts": "it.skip('later', () => {});" });
    const checks = await staticChecks(root);
    expect(failing(checks)).toContain("tests-present");
  });

  it("flags parameters that declare no filter or derived value", async () => {
    const root = await scaffold({
      "src/App.tsx": "export function App() { return null; }",
      "parameters.json": JSON.stringify({ entities: [{ name: "a", fields: [] }], features: {} }),
    });
    const checks = await staticChecks(root);
    expect(failing(checks)).toContain("filters-declared");
    expect(failing(checks)).toContain("derived-declared");
    expect(failing(checks)).not.toContain("entities-declared");
  });

  it("does not award surfaced limitations for configuration alone", async () => {
    const root = await scaffold({
      "src/App.tsx": "export function App() { return null; }",
      "parameters.json": JSON.stringify({
        entities: [],
        features: { limitations: ["This is only declared, never rendered."] },
      }),
    });

    expect(failing(await staticChecks(root))).toContain("limitations-surfaced");
  });

  it("does not award an unmounted limitations component", async () => {
    const root = await scaffold({
      "src/App.tsx": "export function App() { return null; }",
      "src/ui/Limitations.tsx": "export function Limitations() { return <div data-limitations />; }",
      "parameters.json": JSON.stringify({ entities: [], features: { limitations: ["Hidden"] } }),
    });

    expect(failing(await staticChecks(root))).toContain("limitations-surfaced");
  });
});

describe("efficiency", () => {
  const result = {
    status: "success",
    tests_run: [
      { command: "npm test", journey: "adds a record", result: "passed" },
      { command: "npm test", journey: "removes a record", result: "passed" },
    ],
    model_calls: 4,
    input_tokens: 100,
    output_tokens: 200,
    cache_read_tokens: 300,
    cache_write_tokens: 40,
    total_tokens: 640,
    reasoning_tokens: 0,
    cost_total: 0.5,
  } as unknown as RunResult;

  it("reports tokens spent per delivered journey", () => {
    expect(efficiencyFrom(result).tokens_per_journey).toBe(320);
  });

  it("calculates the official weighted efficiency score", () => {
    expect(efficiencyFrom(result).official_score).toBe(730);
  });

  it("renders cache-read weighting to the official single decimal", () => {
    expect(efficiencyFrom({ ...result, cache_read_tokens: 3 } as RunResult).official_score).toBe(700.3);
  });

  it("reports no per-journey figure when nothing was delivered", () => {
    expect(efficiencyFrom({ ...result, tests_run: [] } as RunResult).tokens_per_journey).toBeNull();
  });
});

describe("scorecard", () => {
  it("still reports structural checks when there is no result to read", async () => {
    const scorecard = await buildScorecard(path.resolve("app-template"), path.join(os.tmpdir(), "absent.json"));
    expect(scorecard.efficiency).toBeNull();
    expect(scorecard.passed).toBe(scorecard.total);
  });
});
