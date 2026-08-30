#!/usr/bin/env node
/**
 * Writes `report.partial.json` from `parameters.json`, the two-field
 * `idea_spec.json`, and a real Vitest run.
 *
 * The report is a description of what was built, and what was built is what
 * `parameters.json` declares — so the feature list and the journey list are
 * derived rather than retyped. `tests_run` carries the result Vitest actually
 * produced: this script never claims a journey passed on its own authority.
 */
import { spawn } from "node:child_process";
import { readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";

const appRoot = process.cwd();
const JOURNEY_FILE = path.join("src", "journeys.generated.test.tsx");
const RESULTS_FILE = path.join(appRoot, "node_modules", ".cache", "journey-results.json");

function lower(value) {
  return String(value ?? "").toLowerCase();
}

async function readJson(relative, fallback = null) {
  try {
    return JSON.parse(await readFile(path.join(appRoot, relative), "utf8"));
  } catch {
    return fallback;
  }
}

function runVitest() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(appRoot, "node_modules", "vitest", "vitest.mjs"),
        "run",
        "--reporter=json",
        `--outputFile=${RESULTS_FILE}`,
      ],
      { cwd: appRoot, stdio: ["ignore", "inherit", "inherit"], shell: false },
    );
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

/** Jest-shaped output: one entry per file, each with its assertions. */
function collectAssertions(report) {
  const files = Array.isArray(report?.testResults) ? report.testResults : [];
  const assertions = [];
  for (const file of files) {
    for (const assertion of file.assertionResults ?? []) {
      assertions.push({
        file: String(file.name ?? ""),
        title: String(assertion.title ?? assertion.fullName ?? ""),
        status: String(assertion.status ?? "unknown"),
      });
    }
  }
  return assertions;
}

function describeFilter(filter) {
  const mode = filter.mode ?? "equals";
  if (mode === "truthy" || mode === "falsy") return `Filter the collection to "${filter.label}"`;
  return `Filter the collection by ${lower(filter.label)}`;
}

function featureList(parameters, entity) {
  const label = lower(entity.label);
  const plural = lower(entity.labelPlural ?? `${entity.label}s`);
  const fieldNames = entity.fields.map((field) => lower(field.label));
  const features = [
    `Add a ${label} with ${fieldNames.join(", ")}`,
    `Edit an existing ${label}`,
    `Delete a ${label}, with a confirmation step`,
  ];

  for (const action of entity.actions ?? []) {
    const promptField = action.prompt ? entity.fields.find((field) => field.name === action.prompt) : undefined;
    const collected = promptField ? `, collecting ${lower(promptField.label)} in the row` : "";
    const gated = action.when ? ", offered only when it applies to the record's state" : "";
    features.push(`"${action.label}" as a one-click row action${collected}${gated}`);
  }

  for (const filter of entity.filters ?? []) features.push(describeFilter(filter));
  for (const derived of entity.derived ?? []) features.push(`"${derived.label}", computed over the filtered set`);

  if (parameters.features?.search) features.push(`Search ${plural} by their text`);
  if (entity.sort) features.push(`The whole collection in one list, sorted by ${lower(entity.sort.field)}`);
  if (entity.fields.some((field) => field.type === "combobox")) {
    features.push("An open category: suggested values are offered, an unlisted one is accepted, and a new spelling folds into the one already in use");
  }

  features.push(
    `${parameters.persistence?.adapter === "memory" ? "In-memory" : "Browser localStorage"} persistence; data survives a page refresh`,
    "Required-field validation, empty states, and recovery from unreadable stored data",
  );
  if ((parameters.features?.limitations ?? []).length > 0) {
    features.push("Limitations shown in the interface rather than only in this report");
  }
  return features;
}

function summarize(parameters, entity, ideaSpec) {
  const label = lower(entity.label);
  const plural = lower(entity.labelPlural ?? `${entity.label}s`);
  const sentences = [];

  const description = parameters.product?.description ?? "";
  if (description) sentences.push(description.trim());

  const fields = entity.fields.map((field) => lower(field.label));
  sentences.push(`A ${label} carries ${fields.slice(0, -1).join(", ")}${fields.length > 1 ? ` and ${fields.at(-1)}` : fields[0]}.`);

  const actions = entity.actions ?? [];
  if (actions.length > 0) {
    sentences.push(
      `${actions.map((action) => `"${action.label}"`).join(" and ")} ${actions.length === 1 ? "is a one-click row action" : "are one-click row actions"}, each offered only when it applies, so a repeated click has nothing to repeat.`,
    );
  }

  const filters = entity.filters ?? [];
  if (filters.length > 0) {
    sentences.push(`The collection narrows by ${filters.map((filter) => `"${filter.label}"`).join(" and ")}.`);
  }

  const derived = entity.derived ?? [];
  if (derived.length > 0) {
    sentences.push(`${derived.map((value) => `"${value.label}"`).join(" and ")} sit above the list and track the filtered view.`);
  }

  sentences.push(
    parameters.persistence?.adapter === "memory"
      ? "Data lives in memory for the session."
      : `Everything persists to browser localStorage under "${parameters.persistence?.namespace ?? plural}", with no network, login, or sync.`,
  );

  if (ideaSpec?.target_user) sentences.push(`Built for: ${ideaSpec.target_user}`);
  return sentences.join(" ");
}

async function main() {
  const parameters = await readJson("parameters.json");
  if (!parameters) throw new Error("parameters.json is missing or unreadable");
  const entity = parameters.entities?.[0];
  if (!entity) throw new Error("parameters.json declares no entity to report on");
  const ideaSpec = await readJson("idea_spec.json", {});

  const exitCode = await runVitest();
  const report = await readJson(path.relative(appRoot, RESULTS_FILE), null);
  await rm(RESULTS_FILE, { force: true });
  if (!report) throw new Error("Vitest produced no JSON report — run npm test and fix the suite first");

  const assertions = collectAssertions(report);
  const journeys = assertions.filter((assertion) => assertion.file.endsWith("journeys.generated.test.tsx"));
  if (journeys.length === 0) {
    throw new Error(`No journeys found in ${JOURNEY_FILE} — run npm run journeys first`);
  }

  const allPassed = assertions.every((assertion) => assertion.status === "passed");
  // The contract has three statuses, not two: an app that runs and fails a
  // journey is `partial`, and `failed` is reserved for one that delivered no
  // journey at all. Collapsing both onto `failed` scores a repairable app as a
  // dead one.
  const passed = journeys.filter((journey) => journey.status === "passed").length;
  const result = {
    status: exitCode === 0 && allPassed ? "success" : passed === 0 ? "failed" : "partial",
    app_url: "http://localhost:3000",
    start_command: "npm run dev",
    summary: summarize(parameters, entity, ideaSpec),
    implemented_features: featureList(parameters, entity),
    assumptions: Array.isArray(ideaSpec?.assumptions) ? ideaSpec.assumptions : [],
    tests_run: journeys.map((journey) => ({
      command: `npm test -- ${JOURNEY_FILE.split(path.sep).join("/")}`,
      journey: journey.title,
      result: journey.status === "passed" ? "passed" : "failed",
    })),
  };

  await writeFile(path.join(appRoot, "report.partial.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const failed = result.tests_run.filter((test) => test.result !== "passed").length;
  console.log(
    `Wrote report.partial.json: ${result.tests_run.length} journeys, ${failed} failing, status ${result.status}.`,
  );
  if (result.status !== "success") process.exitCode = 1;
}

await main();
