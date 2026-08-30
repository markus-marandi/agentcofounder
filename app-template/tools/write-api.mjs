#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const appRoot = process.cwd();
const apiPath = path.join(appRoot, "API.md");
const parametersPath = path.join(appRoot, "parameters.json");

function text(value) {
  return String(value ?? "").replace(/[\r\n|`]+/gu, " ").replace(/\s+/gu, " ").trim();
}

function names(items, select) {
  return items.length === 0 ? "None." : `${items.map((item) => `\`${text(select(item))}\``).join(", ")}.`;
}

function renderEntity(entity) {
  const fields = Array.isArray(entity.fields) ? entity.fields : [];
  const filters = Array.isArray(entity.filters) ? entity.filters : [];
  const actions = Array.isArray(entity.actions) ? entity.actions : [];
  const derived = Array.isArray(entity.derived) ? entity.derived : [];
  const lines = [
    `### ${text(entity.labelPlural ?? entity.label ?? entity.name)} (\`${text(entity.name)}\`)`,
    "",
    `Title field: \`${text(entity.titleField)}\`. Every stored record also carries \`id\` and \`createdAt\`.`,
    "",
    "| Field | Type | Required |",
    "|---|---|---|",
    ...fields.map(
      (field) =>
        `| \`${text(field.name)}\` (${text(field.label)}) | \`${text(field.type)}\` | ${field.required === true ? "yes" : "no"} |`,
    ),
    "",
    `Filters: ${names(filters, (filter) => `${filter.label} (${filter.mode ?? "equals"} ${filter.field})`)}`,
    `Derived values: ${names(derived, (value) => `${value.label} (${value.kind})`)}`,
    `Row actions: ${names(actions, (action) => `${action.label} (${action.id})`)}`,
  ];
  return lines.join("\n");
}

const [api, rawParameters] = await Promise.all([
  readFile(apiPath, "utf8"),
  readFile(parametersPath, "utf8"),
]);
const parameters = JSON.parse(rawParameters);
if (!Array.isArray(parameters.entities) || parameters.entities.length === 0) {
  throw new Error("parameters.json declares no entities for API.md");
}

const start = api.indexOf("## Entities");
const end = api.indexOf("## Authentication");
if (start < 0 || end <= start) throw new Error("API.md is missing its Entities/Authentication section boundary");

const section = [
  "## Entities",
  "",
  "Generated from `parameters.json`; do not edit this section by hand.",
  "",
  parameters.entities.map(renderEntity).join("\n\n"),
  "",
  "Row actions use the same `repository.update(id, changes)` boundary as edits.",
  "`@today` and `@now` values are resolved in `src/data/operations.ts`.",
].join("\n");

const next = `${api.slice(0, start)}${section}\n\n${api.slice(end)}`;
await writeFile(apiPath, next, "utf8");
console.log(`Wrote API.md for ${parameters.entities.length} ${parameters.entities.length === 1 ? "entity" : "entities"}.`);
