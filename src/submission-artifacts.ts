import { copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { officialEfficiencyScore } from "./efficiency.js";
import type { RunResult } from "./types.js";

export function renderSummary(result: RunResult): string {
  const score = officialEfficiencyScore(result);
  const lines = [
    "# Agent Cofounder run summary",
    "",
    `- Status: ${result.status}`,
    `- Official efficiency score: ${score}`,
    `- Model calls: ${result.model_calls}`,
    `- Input tokens: ${result.input_tokens}`,
    `- Output tokens: ${result.output_tokens}`,
    `- Cache read tokens: ${result.cache_read_tokens}`,
    `- Cache write tokens: ${result.cache_write_tokens}`,
    `- Total provider tokens: ${result.total_tokens}`,
    `- App URL: ${result.app_url}`,
    "",
    "## Product",
    "",
    result.summary,
    "",
    "## Implemented features",
    "",
    ...(result.implemented_features.length > 0
      ? result.implemented_features.map((feature) => `- ${feature}`)
      : ["- None reported."]),
    "",
    "## Assumptions and limitations",
    "",
    ...(result.assumptions.length > 0
      ? result.assumptions.map((assumption) => `- ${assumption}`)
      : ["- None reported."]),
    "",
    "## Verification",
    "",
    ...[...result.tests_run, ...result.harness_checks].map(
      (test) => `- ${test.result === "passed" ? "PASS" : "FAIL"}: ${test.journey} (\`${test.command}\`)`,
    ),
    "",
  ];
  return lines.join("\n");
}

/** Copies the raw Pi event bytes unchanged and writes the same deterministic summary at every submission location. */
export async function writeSubmissionArtifacts(options: {
  eventFile: string;
  artifactDirectory: string;
  outputDirectory: string;
  repositoryRoot: string;
  result: RunResult;
}): Promise<string[]> {
  const destinations = [options.artifactDirectory, options.outputDirectory, options.repositoryRoot];
  const summary = renderSummary(options.result);
  const paths: string[] = [];

  for (const destination of destinations) {
    const tracePath = path.join(destination, "trace.jsonl");
    const summaryPath = path.join(destination, "summary.md");
    await Promise.all([
      copyFile(options.eventFile, tracePath),
      writeFile(summaryPath, summary, "utf8"),
    ]);
    paths.push(tracePath, summaryPath);
  }

  return paths;
}
