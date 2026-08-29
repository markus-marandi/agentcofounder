import rawParameters from "../../parameters.json";
import type { EntitySpec, NavigationSpec, Parameters, Route, ThemePreset } from "./types.js";

const ROUTES: Route[] = ["landing-page", "web-app", "prototype", "mock-dashboard", "open-build"];
const FIELD_TYPES = new Set(["text", "longtext", "number", "date", "select", "boolean"]);
const FILTER_MODES = new Set(["equals", "truthy", "falsy", "contains", "beforeToday"]);
const DERIVED_KINDS = new Set(["count", "countWhere", "sum", "average", "min", "max", "distinct"]);

const THEMES: ThemePreset[] = [
  "modern-minimalist",
  "arctic-frost",
  "tech-innovation",
  "ocean-depths",
  "forest-canopy",
  "botanical-garden",
  "golden-hour",
  "sunset-boulevard",
  "desert-rose",
  "midnight-galaxy",
];

/** Layout is chosen from how many menu entries exist, not hand-picked. */
export type ShellLayout = "single" | "bar" | "sidebar";

export function shellLayout(navigation: NavigationSpec[]): ShellLayout {
  if (navigation.length <= 1) return "single";
  if (navigation.length <= 4) return "bar";
  return "sidebar";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Collects every problem rather than throwing on the first, so a misconfigured
 * `parameters.json` produces one actionable list instead of a guessing game.
 */
export function validateParameters(candidate: unknown): string[] {
  const problems: string[] = [];
  if (!isRecord(candidate)) return ["parameters.json must contain a JSON object"];

  if (!ROUTES.includes(candidate.route as Route)) {
    problems.push(`route must be one of: ${ROUTES.join(", ")}`);
  }

  const product = candidate.product;
  if (!isRecord(product) || typeof product.name !== "string" || product.name.trim() === "") {
    problems.push("product.name is required");
  }
  if (!isRecord(product) || typeof product.tagline !== "string" || product.tagline.trim() === "") {
    problems.push("product.tagline is required");
  }

  const theme = candidate.theme;
  if (!isRecord(theme) || !THEMES.includes(theme.preset as ThemePreset)) {
    problems.push(`theme.preset must be one of: ${THEMES.join(", ")}`);
  }

  const navigation = candidate.navigation;
  if (!Array.isArray(navigation) || navigation.length === 0) {
    problems.push("navigation must list at least one entry");
  }

  const entities = candidate.entities;
  if (!Array.isArray(entities) || entities.length === 0) {
    problems.push("entities must list at least one persisted record type");
  } else {
    for (const [index, entity] of entities.entries()) {
      if (!isRecord(entity)) {
        problems.push(`entities[${index}] must be an object`);
        continue;
      }
      if (typeof entity.name !== "string" || entity.name === "") {
        problems.push(`entities[${index}].name is required`);
      }
      if (typeof entity.label !== "string" || entity.label === "") problems.push(`entities[${index}].label is required`);
      if (typeof entity.labelPlural !== "string" || entity.labelPlural === "") problems.push(`entities[${index}].labelPlural is required`);
      if (!Array.isArray(entity.fields) || entity.fields.length === 0) {
        problems.push(`entities[${index}].fields must list at least one field`);
        continue;
      }
      const fieldNames = new Set<string>();
      for (const [fieldIndex, field] of entity.fields.entries()) {
        if (!isRecord(field) || typeof field.name !== "string" || field.name === "") {
          problems.push(`entities[${index}].fields[${fieldIndex}].name is required`);
          continue;
        }
        if (fieldNames.has(field.name)) problems.push(`entities[${index}].field names must be unique`);
        fieldNames.add(field.name);
        if (!FIELD_TYPES.has(String(field.type))) problems.push(`entities[${index}].fields[${fieldIndex}].type is unsupported`);
        if (field.type === "select" && (!Array.isArray(field.options) || field.options.length === 0)) {
          problems.push(`entities[${index}].fields[${fieldIndex}].options are required`);
        }
      }
      if (entity.titleField !== undefined && (typeof entity.titleField !== "string" || !fieldNames.has(entity.titleField))) {
        problems.push(`entities[${index}].titleField must reference a field when supplied`);
      }
      if (entity.filters !== undefined && !Array.isArray(entity.filters)) {
        problems.push(`entities[${index}].filters must be an array when supplied`);
      } else if (Array.isArray(entity.filters)) {
        for (const [filterIndex, filter] of entity.filters.entries()) {
          if (!isRecord(filter) || !fieldNames.has(String(filter.field))) {
            problems.push(`entities[${index}].filters[${filterIndex}].field must reference a field`);
          }
          if (!isRecord(filter) || !FILTER_MODES.has(String(filter.mode ?? "equals"))) {
            problems.push(`entities[${index}].filters[${filterIndex}].mode is unsupported`);
          }
        }
      }
      if (entity.derived !== undefined && !Array.isArray(entity.derived)) {
        problems.push(`entities[${index}].derived must be an array when supplied`);
      } else if (Array.isArray(entity.derived)) {
        for (const [derivedIndex, derived] of entity.derived.entries()) {
          if (!isRecord(derived) || !DERIVED_KINDS.has(String(derived.kind))) {
            problems.push(`entities[${index}].derived[${derivedIndex}].kind is unsupported`);
            continue;
          }
          if (derived.field !== undefined && !fieldNames.has(String(derived.field))) {
            problems.push(`entities[${index}].derived[${derivedIndex}].field must reference a field`);
          }
          if (derived.kind === "countWhere") {
            const where = derived.where;
            if (!isRecord(where) || !fieldNames.has(String(where.field)) || !FILTER_MODES.has(String(where.mode))) {
              problems.push(`entities[${index}].derived[${derivedIndex}].where is invalid`);
            }
          }
        }
      }
    }
  }

  const features = candidate.features;
  if (features !== undefined && !isRecord(features)) {
    problems.push("features must be an object when supplied");
  } else if (isRecord(features)) {
    if (features.search !== undefined && typeof features.search !== "boolean") problems.push("features.search must be boolean");
    if (features.auth !== undefined && typeof features.auth !== "boolean") problems.push("features.auth must be boolean");
    if (features.limitations !== undefined && !Array.isArray(features.limitations)) {
      problems.push("features.limitations must be an array when supplied");
    }
  }

  const persistence = candidate.persistence;
  if (!isRecord(persistence)) {
    problems.push("persistence is required");
  } else {
    if (persistence.adapter !== "localStorage" && persistence.adapter !== "memory") {
      problems.push("persistence.adapter must be localStorage or memory");
    }
    if (typeof persistence.namespace !== "string" || persistence.namespace === "") {
      problems.push("persistence.namespace is required");
    }
  }

  if (Array.isArray(navigation) && Array.isArray(entities)) {
    const names = new Set(
      entities.filter(isRecord).map((entity) => String(entity.name)),
    );
    for (const [index, entry] of navigation.entries()) {
      if (!isRecord(entry)) continue;
      if (entry.entity !== undefined && !names.has(String(entry.entity))) {
        problems.push(`navigation[${index}].entity "${String(entry.entity)}" has no matching entity`);
      }
    }
  }

  return problems;
}

const problems = validateParameters(rawParameters);

/**
 * A malformed `parameters.json` is a build-time authoring mistake, not a
 * runtime condition a user can recover from, so it fails loudly and early.
 */
if (problems.length > 0) {
  throw new Error(`Invalid parameters.json:\n- ${problems.join("\n- ")}`);
}

export const parameters = rawParameters as unknown as Parameters;

export const layout: ShellLayout = shellLayout(parameters.navigation);

export function entityByName(name: string | undefined): EntitySpec | undefined {
  if (!name) return undefined;
  return parameters.entities.find((entity) => entity.name === name);
}

/** The entity a view should show when its navigation entry names none. */
export function defaultEntity(): EntitySpec {
  return parameters.entities[0];
}

export function titleOf(entity: EntitySpec, record: Record<string, unknown>): string {
  const field = entity.titleField ?? entity.fields[0]?.name;
  const value = field ? record[field] : undefined;
  return value === undefined || value === null || value === "" ? `Untitled ${entity.label}` : String(value);
}
