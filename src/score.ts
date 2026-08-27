import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { RunResult } from "./types.js";

/**
 * Development instrument, not the official score.
 *
 * Two halves. The static half inspects generated source for the structural
 * properties the rubric rewards and runs without credentials, so CI can gate on
 * it. The efficiency half reads a completed `result.json` and needs a real run.
 *
 * Everything here must stay domain-neutral: judging uses a different idea.
 */

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SOURCE_DIRECTORY, "..");

export interface Check {
  id: string;
  category: "persistence" | "robustness" | "integration" | "reach";
  passed: boolean;
  detail: string;
}

export interface Efficiency {
  model_calls: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cost_total: number;
  /** Total tokens spent per delivered journey — the number to drive down. */
  tokens_per_journey: number | null;
  journeys: number;
}

export interface Scorecard {
  generated_at: string;
  app_directory: string;
  checks: Check[];
  passed: number;
  total: number;
  efficiency: Efficiency | null;
  status: RunResult["status"] | null;
}

async function collectSources(directory: string): Promise<Array<{ path: string; text: string }>> {
  const files: Array<{ path: string; text: string }> = [];
  const sourceRoot = path.join(directory, "src");

  async function walk(current: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(current);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry === "node_modules" || entry === "dist" || entry === ".git") continue;
      const full = path.join(current, entry);
      const info = await stat(full);
      if (info.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!/\.(tsx?|css)$/u.test(entry)) continue;
      // Relative to `src`, so a caller can match on "ui/" without repeating the prefix.
      files.push({ path: path.relative(sourceRoot, full), text: await readFile(full, "utf8") });
    }
  }

  await walk(sourceRoot);
  return files;
}

function check(id: string, category: Check["category"], passed: boolean, detail: string): Check {
  return { id, category, passed, detail };
}

export async function staticChecks(appDirectory: string): Promise<Check[]> {
  const sources = await collectSources(appDirectory);
  const isTest = (file: { path: string }): boolean => /\.test\.tsx?$/u.test(file.path);
  const tests = sources.filter(isTest);
  const production = sources.filter((file) => !isTest(file));
  // Tests may reach for storage to set up a fixture; production components may not.
  const components = production.filter((file) => file.path.startsWith("ui/") || /App\.tsx$/u.test(file.path));
  const everything = production.map((file) => file.text).join("\n");

  const readFileSafely = async (relative: string): Promise<string | null> => {
    try {
      return await readFile(path.join(appDirectory, relative), "utf8");
    } catch {
      return null;
    }
  };

  const parameters = await readFileSafely("parameters.json");
  const apiDocumentation = await readFileSafely("API.md");
  const configured = parameters ? (JSON.parse(parameters) as Record<string, unknown>) : null;
  const entities = Array.isArray(configured?.entities) ? (configured.entities as Array<Record<string, unknown>>) : [];
  const features = (configured?.features ?? {}) as { limitations?: unknown };

  const leakedStorage = components.filter((file) => /\blocalStorage\b|\bsessionStorage\b/u.test(file.text));

  return [
    check(
      "repository-boundary",
      "integration",
      /createRepository|Repository</u.test(everything),
      "Data access goes through a repository rather than ad-hoc storage calls.",
    ),
    check(
      "storage-not-in-components",
      "integration",
      leakedStorage.length === 0,
      leakedStorage.length === 0
        ? "No component touches browser storage directly."
        : `Components reaching storage directly: ${leakedStorage.map((file) => file.path).join(", ")}.`,
    ),
    check(
      "swappable-adapter",
      "integration",
      /StorageAdapter/u.test(everything),
      "A named adapter interface exists, so another backend can be added without touching the interface.",
    ),
    check(
      "api-documented",
      "integration",
      (apiDocumentation?.length ?? 0) > 400,
      "API.md describes the data boundary.",
    ),
    check(
      "entities-declared",
      "persistence",
      entities.length > 0,
      `parameters.json declares ${entities.length} persisted entity type(s).`,
    ),
    check(
      "filters-declared",
      "persistence",
      entities.some((entity) => Array.isArray(entity.filters) && entity.filters.length > 0),
      "At least one entity can be narrowed by a filter.",
    ),
    check(
      "derived-declared",
      "persistence",
      entities.some((entity) => Array.isArray(entity.derived) && entity.derived.length > 0),
      "At least one derived value is shown.",
    ),
    check(
      "persistence-tested",
      "persistence",
      tests.some((file) => /refresh|remount|persist|reload/iu.test(file.text)),
      "A test covers data surviving a refresh.",
    ),
    check(
      "validation",
      "robustness",
      /validateDraft|aria-invalid/u.test(everything),
      "Input is validated and invalid fields are marked for assistive technology.",
    ),
    check(
      "error-boundary",
      "robustness",
      /ErrorBoundary/u.test(everything),
      "A rendering failure is contained rather than blanking the page.",
    ),
    check(
      "corrupt-data-recovery",
      "robustness",
      /catch/u.test(everything) && /JSON\.parse/u.test(everything),
      "Stored data is parsed defensively.",
    ),
    check(
      "empty-states",
      "robustness",
      /EmptyState|No .* yet/u.test(everything),
      "Empty collections explain themselves instead of rendering nothing.",
    ),
    check(
      "destructive-confirmation",
      "robustness",
      /confirm/iu.test(components.map((file) => file.text).join("\n")),
      "Removal asks before it destroys anything.",
    ),
    check(
      "tests-present",
      "robustness",
      tests.length > 0 && !/\.(skip|todo)\(/u.test(tests.map((file) => file.text).join("\n")),
      `${tests.length} test file(s), none skipped or todo.`,
    ),
    check(
      "responsive",
      "reach",
      /@media[^{]*min-width/u.test(everything) || /\b(?:sm|md|lg|xl|2xl):[a-z-]/u.test(everything),
      "Layout adapts between narrow and wide screens.",
    ),
    check(
      "limitations-surfaced",
      "reach",
      Array.isArray(features.limitations) && features.limitations.length > 0,
      "Limitations are declared so the interface can show them.",
    ),
    check(
      "accessible-queries",
      "reach",
      tests.length === 0 || tests.some((file) => /getByRole|getByLabelText/u.test(file.text)),
      "Tests address the interface by accessible name rather than by structure.",
    ),
  ];
}

export function efficiencyFrom(result: RunResult): Efficiency {
  const journeys = result.tests_run.length;
  return {
    model_calls: result.model_calls,
    input_tokens: result.input_tokens,
    output_tokens: result.output_tokens,
    cache_read_tokens: result.cache_read_tokens,
    cache_write_tokens: result.cache_write_tokens,
    total_tokens: result.total_tokens,
    reasoning_tokens: result.reasoning_tokens,
    cost_total: result.cost_total,
    journeys,
    tokens_per_journey: journeys > 0 ? Math.round(result.total_tokens / journeys) : null,
  };
}

export async function buildScorecard(appDirectory: string, resultPath: string | null): Promise<Scorecard> {
  const checks = await staticChecks(appDirectory);
  let efficiency: Efficiency | null = null;
  let status: RunResult["status"] | null = null;

  if (resultPath) {
    try {
      const result = JSON.parse(await readFile(resultPath, "utf8")) as RunResult;
      efficiency = efficiencyFrom(result);
      status = result.status;
    } catch {
      // A missing or unreadable result only removes the efficiency half.
    }
  }

  return {
    generated_at: new Date().toISOString(),
    app_directory: path.relative(REPOSITORY_ROOT, appDirectory) || ".",
    checks,
    passed: checks.filter((entry) => entry.passed).length,
    total: checks.length,
    efficiency,
    status,
  };
}

function render(scorecard: Scorecard): string {
  const lines = [`Scorecard for ${scorecard.app_directory}`, ""];
  for (const entry of scorecard.checks) {
    lines.push(`${entry.passed ? "pass" : "FAIL"}  [${entry.category}] ${entry.id} — ${entry.detail}`);
  }
  lines.push("", `${scorecard.passed}/${scorecard.total} structural checks passed.`);

  if (scorecard.efficiency) {
    const efficiency = scorecard.efficiency;
    lines.push(
      "",
      `Run status: ${scorecard.status ?? "unknown"}`,
      `Model calls: ${efficiency.model_calls}`,
      `Tokens: ${efficiency.total_tokens} total (${efficiency.input_tokens} in, ${efficiency.output_tokens} out, ${efficiency.cache_read_tokens} cache read, ${efficiency.cache_write_tokens} cache write)`,
      `Cost: ${efficiency.cost_total}`,
      `Journeys delivered: ${efficiency.journeys}${efficiency.tokens_per_journey === null ? "" : ` (${efficiency.tokens_per_journey} tokens each)`}`,
    );
  } else {
    lines.push("", "No result.json read, so efficiency was not measured. Run `npm run challenge` first.");
  }

  return lines.join("\n");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const staticOnly = argv.includes("--static");
  const valueAfter = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const appDirectory = path.resolve(valueAfter("--app-dir") ?? path.join(REPOSITORY_ROOT, "output", "app"));
  const resultPath = staticOnly
    ? null
    : path.resolve(valueAfter("--result") ?? path.join(REPOSITORY_ROOT, "result.json"));

  const scorecard = await buildScorecard(appDirectory, resultPath);
  console.log(render(scorecard));

  const outputPath = path.join(REPOSITORY_ROOT, "artifacts", "score.json");
  try {
    await writeFile(outputPath, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");
    console.log(`\nScorecard written to ${path.relative(REPOSITORY_ROOT, outputPath)}`);
  } catch (error) {
    console.warn(`Could not write the scorecard: ${String(error)}`);
  }

  if (scorecard.passed !== scorecard.total) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
