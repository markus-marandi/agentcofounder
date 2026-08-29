import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RunResult } from "./types.js";
import { validateResultObject } from "./validate-result.js";

export interface BenchmarkRun {
  candidate: string;
  fixture: string;
  result: RunResult;
}

export interface CandidateComparison {
  candidate: string;
  runs: number;
  verified_successes: number;
  success_rate: number;
  total_tokens: number;
  model_calls: number;
  tokens_per_verified_success: number | null;
  quality_frontier: boolean;
}

export interface BenchmarkComparison {
  fixture_count: number;
  fixtures: string[];
  model: string;
  winner: string | null;
  ranking: "verified-successes-then-total-tokens-per-verified-success";
  candidates: CandidateComparison[];
}

interface ManifestEntry {
  candidate: string;
  fixture: string;
  result: string;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function sameStrings(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function isVerifiedSuccess(result: RunResult): boolean {
  return result.status === "success" &&
    result.pi_exit_code === 0 &&
    result.model_calls > 0 &&
    result.tests_run.length > 0 &&
    result.tests_run.every((test) => test.result === "passed") &&
    result.harness_checks.length > 0 &&
    result.harness_checks.every((check) => check.result === "passed") &&
    !result.port_reclamation.listener_after_pi;
}

export function compareBenchmarkRuns(runs: BenchmarkRun[]): BenchmarkComparison {
  if (runs.length === 0) throw new Error("The benchmark must contain runs");
  const candidates = sorted(new Set(runs.map((run) => run.candidate)));
  if (candidates.length < 2) throw new Error("The benchmark must contain at least two candidates");

  const duplicateKeys = new Set<string>();
  for (const run of runs) {
    if (run.candidate.trim() === "" || run.fixture.trim() === "") {
      throw new Error("Every run needs a candidate and fixture name");
    }
    const key = `${run.candidate}\u0000${run.fixture}`;
    if (duplicateKeys.has(key)) throw new Error(`Duplicate run for ${run.candidate}/${run.fixture}`);
    duplicateKeys.add(key);
  }

  const fixturesByCandidate = new Map<string, string[]>();
  for (const candidate of candidates) {
    fixturesByCandidate.set(candidate, sorted(runs.filter((run) => run.candidate === candidate).map((run) => run.fixture)));
  }
  const fixtures = fixturesByCandidate.get(candidates[0]!)!;
  if (fixtures.length === 0 || candidates.some((candidate) => !sameStrings(fixturesByCandidate.get(candidate)!, fixtures))) {
    throw new Error("Every candidate must use the same fixture population");
  }

  const models = new Set(runs.flatMap((run) => run.result.call_log.map((call) => call.model)));
  if (models.size !== 1 || runs.some((run) => run.result.call_log.length === 0)) {
    throw new Error("Every run must use the same model and include model-call evidence");
  }

  const summaries = candidates.map((candidate): CandidateComparison => {
    const candidateRuns = runs.filter((run) => run.candidate === candidate);
    const verifiedSuccesses = candidateRuns.filter((run) => isVerifiedSuccess(run.result)).length;
    const totalTokens = candidateRuns.reduce((total, run) => total + run.result.total_tokens, 0);
    return {
      candidate,
      runs: candidateRuns.length,
      verified_successes: verifiedSuccesses,
      success_rate: Number((verifiedSuccesses / candidateRuns.length).toFixed(4)),
      total_tokens: totalTokens,
      model_calls: candidateRuns.reduce((total, run) => total + run.result.model_calls, 0),
      tokens_per_verified_success: verifiedSuccesses > 0
        ? Number((totalTokens / verifiedSuccesses).toFixed(2))
        : null,
      quality_frontier: false,
    };
  });
  const bestQuality = Math.max(...summaries.map((candidate) => candidate.verified_successes));
  for (const summary of summaries) summary.quality_frontier = summary.verified_successes === bestQuality;
  summaries.sort((left, right) => {
    const quality = right.verified_successes - left.verified_successes;
    if (quality !== 0) return quality;
    const leftEfficiency = left.tokens_per_verified_success ?? Number.POSITIVE_INFINITY;
    const rightEfficiency = right.tokens_per_verified_success ?? Number.POSITIVE_INFINITY;
    if (leftEfficiency !== rightEfficiency) return leftEfficiency - rightEfficiency;
    return left.candidate.localeCompare(right.candidate);
  });

  const first = summaries[0];
  const second = summaries[1];
  const tied = first !== undefined && second !== undefined &&
    first.verified_successes === second.verified_successes &&
    first.tokens_per_verified_success === second.tokens_per_verified_success;
  return {
    fixture_count: fixtures.length,
    fixtures,
    model: [...models][0]!,
    winner: !first || first.verified_successes === 0 || tied ? null : first.candidate,
    ranking: "verified-successes-then-total-tokens-per-verified-success",
    candidates: summaries,
  };
}

async function readManifest(manifestPath: string): Promise<BenchmarkRun[]> {
  const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as { version?: unknown; runs?: unknown };
  if (parsed.version !== 1 || !Array.isArray(parsed.runs) || parsed.runs.length === 0) {
    throw new Error("Benchmark manifest must have version 1 and a non-empty runs array");
  }
  const manifestDirectory = path.dirname(manifestPath);
  return await Promise.all(parsed.runs.map(async (raw, index): Promise<BenchmarkRun> => {
    if (typeof raw !== "object" || raw === null) throw new Error(`runs[${index}] must be an object`);
    const entry = raw as Partial<ManifestEntry>;
    if (typeof entry.candidate !== "string" || typeof entry.fixture !== "string" || typeof entry.result !== "string") {
      throw new Error(`runs[${index}] must contain candidate, fixture, and result strings`);
    }
    const resultPath = path.resolve(manifestDirectory, entry.result);
    const result = JSON.parse(await readFile(resultPath, "utf8")) as unknown;
    const errors = await validateResultObject(result);
    if (errors.length > 0) throw new Error(`${resultPath} is invalid: ${errors.join("; ")}`);
    return { candidate: entry.candidate, fixture: entry.fixture, result: result as RunResult };
  }));
}

function valueAfter(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const manifestArgument = valueAfter(argv, "--manifest");
  if (!manifestArgument) throw new Error("Usage: npm run benchmark:compare -- --manifest <path> [--output <path>]");
  const manifestPath = path.resolve(manifestArgument);
  const outputPath = path.resolve(valueAfter(argv, "--output") ?? path.join("artifacts", "token-comparison.json"));
  const comparison = compareBenchmarkRuns(await readManifest(manifestPath));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ generated_at: new Date().toISOString(), manifest: manifestPath, ...comparison }, null, 2)}\n`, "utf8");

  for (const candidate of comparison.candidates) {
    console.log(
      `${candidate.quality_frontier ? "quality" : "below  "} ${candidate.candidate}: ` +
      `${candidate.verified_successes}/${candidate.runs} verified; ` +
      `${candidate.tokens_per_verified_success ?? "n/a"} tokens/verified success`,
    );
  }
  console.log(`Winner: ${comparison.winner ?? "none (tie or no verified success)"}`);
  console.log(`Comparison written to ${outputPath}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
