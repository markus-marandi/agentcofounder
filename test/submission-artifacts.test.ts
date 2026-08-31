import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { renderSummary, writeSubmissionArtifacts } from "../src/submission-artifacts.js";
import type { RunResult } from "../src/types.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

const result = {
  status: "success",
  app_url: "http://localhost:3000",
  start_command: "npm run start",
  summary: "A useful product.",
  implemented_features: ["Create records"],
  assumptions: ["Local storage only"],
  tests_run: [{ command: "npm test", journey: "create", result: "passed" }],
  harness_checks: [{ command: "npm run build", journey: "build", result: "passed" }],
  model_calls: 1,
  input_tokens: 100,
  output_tokens: 200,
  cache_read_tokens: 300,
  cache_write_tokens: 40,
  total_tokens: 640,
  reasoning_tokens: 0,
  cost_total: 0.5,
} as unknown as RunResult;

describe("submission artifacts", () => {
  it("renders a deterministic summary with the official score", () => {
    expect(renderSummary(result)).toBe(renderSummary(result));
    expect(renderSummary(result)).toContain("Official efficiency score: 730");
  });

  it("copies the trace byte-for-byte and emits identical summaries", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-artifacts-"));
    temporaryDirectories.push(root);
    const artifactDirectory = path.join(root, "artifacts");
    const outputDirectory = path.join(root, "output");
    await Promise.all([mkdir(artifactDirectory), mkdir(outputDirectory)]);
    const eventFile = path.join(root, "events.jsonl");
    const trace = "{\"type\":\"message_end\",\"n\":1}\r\n{\"type\":\"agent_end\"}\n";
    await writeFile(eventFile, trace, "utf8");

    await writeSubmissionArtifacts({ eventFile, artifactDirectory, outputDirectory, repositoryRoot: root, result });

    for (const destination of [artifactDirectory, outputDirectory, root]) {
      expect(await readFile(path.join(destination, "trace.jsonl"), "utf8")).toBe(trace);
      expect(await readFile(path.join(destination, "summary.md"), "utf8")).toBe(renderSummary(result));
    }
  });
});
