import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildPiArguments } from "../src/run-challenge.js";

const MODEL_CONTEXT_FILES = [
  "solution/system-prompt.md",
  "contract-public/journeys.md",
  "app-template/AGENTS.md",
] as const;

async function modelContext(): Promise<[string, string, string]> {
  return await Promise.all([
    readFile(path.resolve(MODEL_CONTEXT_FILES[0]), "utf8"),
    readFile(path.resolve(MODEL_CONTEXT_FILES[1]), "utf8"),
    readFile(path.resolve(MODEL_CONTEXT_FILES[2]), "utf8"),
  ]);
}

describe("model context efficiency", () => {
  it("keeps the repository-authored initial prompt within its character budget", async () => {
    const context = await modelContext();
    expect(context.reduce((total, text) => total + text.length, 0)).toBeLessThanOrEqual(7_000);
  });

  it("does not ask the model to reload context already present in its prompt", async () => {
    const [systemPrompt, publicJourneys, appContext] = await modelContext();
    const args = buildPiArguments("Build a lending library", systemPrompt, publicJourneys, appContext, "/tmp/run");

    expect(systemPrompt).toMatch(/already includes `AGENTS\.md`[\s\S]+do not read it again/iu);
    expect(systemPrompt).toContain("do not read `parameters.schema.json`");
    expect(systemPrompt).toMatch(/create `idea_spec\.json`/iu);
    expect(systemPrompt).toContain("with only `target_user` and `assumptions`");
    expect(systemPrompt).toContain("Do not edit `API.md`");
    expect(systemPrompt).not.toMatch(/load the .+ skill/iu);
    expect(args).not.toContain("--skill");
    expect(args[args.indexOf("--tools") + 1]?.split(",")).toEqual(["read", "edit", "write"]);
  });

  it("leaves deterministic execution with the verifier", async () => {
    const verifier = await readFile(path.resolve("solution/extensions/verify-loop.ts"), "utf8");
    for (const requiredStep of [
      "generate-journeys.mjs",
      "write-api.mjs",
      "vitest",
      '"run", "build"',
      "write-report.mjs",
    ]) {
      expect(verifier).toContain(requiredStep);
    }
  });
});
