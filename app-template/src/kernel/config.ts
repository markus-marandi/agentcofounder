import rawParameters from "../../parameters.json";
import type { EntitySpec, NavigationSpec, Parameters, Route, ThemePreset } from "./types.js";

const ROUTES: Route[] = ["landing-page", "web-app", "prototype", "mock-dashboard", "open-build"];

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
      if (!Array.isArray(entity.fields) || entity.fields.length === 0) {
        problems.push(`entities[${index}].fields must list at least one field`);
      }
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
