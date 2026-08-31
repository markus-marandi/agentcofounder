import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compileSingleStageContext } from "../src/icm-context.js";
import { buildPiArguments } from "../src/run-challenge.js";

const MODEL_CONTEXT_FILES = [
  "solution/icm-configure-stage.md",
  "app-template/parameters.json",
] as const;

async function modelContext(): Promise<string> {
  const [stage, seed] = await Promise.all([
    readFile(path.resolve(MODEL_CONTEXT_FILES[0]), "utf8"),
    readFile(path.resolve(MODEL_CONTEXT_FILES[1]), "utf8"),
  ]);
  return compileSingleStageContext(stage, seed);
}

describe("model context efficiency", () => {
  it("keeps the repository-authored initial prompt within its character budget", async () => {
    const context = await modelContext();
    expect(context.length).toBeLessThanOrEqual(7_000);
  });

  it("provides one compiled write-only stage with no model-directed discovery", async () => {
    const context = await modelContext();
    const args = buildPiArguments("Build a lending library", context, "", "", "/tmp/run");

    expect(context).toContain("single compiled stage");
    expect(context).toContain("write only\n`candidate.json`");
    expect(context).toContain('"route":"web-app"');
    expect(context).toContain("Condition modes are `equals`, `truthy`, `falsy`, `contains`, or `beforeToday`");
    expect(context).not.toContain("parameters.schema.json");
    expect(args).not.toContain("--skill");
    expect(args[args.indexOf("--tools") + 1]?.split(",")).toEqual(["write"]);
  });

  it("leaves deterministic execution with the verifier", async () => {
    const verifier = await readFile(path.resolve("solution/extensions/verify-loop.ts"), "utf8");
    expect(verifier).toContain('pi.on("tool_result"');
    expect(verifier).toContain("context.abort()");
    expect(verifier).not.toContain("Reply only `done`");
    expect(verifier).not.toContain('pi.on("agent_settled"');
    for (const requiredStep of [
      "generate-journeys.mjs",
      "materialize-candidate.mjs",
      "write-api.mjs",
      "vitest",
      '"run", "build"',
      "write-report.mjs",
    ]) {
      expect(verifier).toContain(requiredStep);
    }
  });
});
