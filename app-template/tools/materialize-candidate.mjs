#!/usr/bin/env node
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const appRoot = process.cwd();

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object`);
  }
  return value;
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} must contain exactly: ${wanted.join(", ")}`);
  }
}

function validatedCandidate(value) {
  const candidate = object(value, "candidate.json");
  exactKeys(candidate, ["idea_spec", "parameters"], "candidate.json");
  const ideaSpec = object(candidate.idea_spec, "idea_spec");
  exactKeys(ideaSpec, ["target_user", "assumptions"], "idea_spec");
  if (typeof ideaSpec.target_user !== "string" || ideaSpec.target_user.trim() === "") {
    throw new Error("idea_spec.target_user must be a non-empty string");
  }
  if (
    !Array.isArray(ideaSpec.assumptions) ||
    ideaSpec.assumptions.some((item) => typeof item !== "string" || item.trim() === "")
  ) {
    throw new Error("idea_spec.assumptions must be an array of non-empty strings");
  }
  const parameters = object(candidate.parameters, "parameters");
  return { ideaSpec, parameters };
}

async function main() {
  let candidate;
  try {
    candidate = JSON.parse(await readFile(path.join(appRoot, "candidate.json"), "utf8"));
  } catch (error) {
    throw new Error(`candidate.json is missing or invalid JSON: ${String(error)}`);
  }
  const { ideaSpec, parameters } = validatedCandidate(candidate);
  const nonce = `${process.pid}-${Date.now()}`;
  const ideaTemp = path.join(appRoot, `.idea_spec-${nonce}.tmp`);
  const parametersTemp = path.join(appRoot, `.parameters-${nonce}.tmp`);
  try {
    await Promise.all([
      writeFile(ideaTemp, `${JSON.stringify(ideaSpec, null, 2)}\n`, "utf8"),
      writeFile(parametersTemp, `${JSON.stringify(parameters, null, 2)}\n`, "utf8"),
    ]);
    await rename(ideaTemp, path.join(appRoot, "idea_spec.json"));
    await rename(parametersTemp, path.join(appRoot, "parameters.json"));
  } finally {
    await Promise.all([rm(ideaTemp, { force: true }), rm(parametersTemp, { force: true })]);
  }
  console.log("Materialized idea_spec.json and parameters.json from candidate.json.");
}

await main();
