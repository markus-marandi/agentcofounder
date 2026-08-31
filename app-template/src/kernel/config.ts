import rawParameters from "../../parameters.json";
import type { EntitySpec, Parameters, Route, ThemePreset } from "./types.js";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Present on every stored record, so they are addressable without being declared. */
const KERNEL_FIELDS = ["id", "createdAt"];

const FIELD_TYPES = ["text", "longtext", "number", "date", "select", "combobox", "boolean"];
const FILTER_MODES = ["equals", "truthy", "falsy", "contains", "beforeToday"];

/**
 * Every place a configuration names a field. A typo here is the most common way
 * a `parameters.json` reaches the browser and then silently filters nothing, so
 * it is caught by name at load rather than by absence at runtime.
 */
function checkEntityReferences(entity: Record<string, unknown>, index: number, problems: string[]): void {
  const fields = Array.isArray(entity.fields) ? entity.fields.filter(isRecord) : [];
  const declared = new Set([...fields.map((field) => String(field.name)), ...KERNEL_FIELDS]);
  const where = `entities[${index}]`;

  const requireField = (name: unknown, at: string): void => {
    if (name === undefined) return;
    if (!declared.has(String(name))) {
      problems.push(`${at} names field "${String(name)}", which ${where} does not declare`);
    }
  };

  const requireMode = (mode: unknown, at: string): void => {
    if (mode !== undefined && !FILTER_MODES.includes(String(mode))) {
      problems.push(`${at} mode "${String(mode)}" must be one of: ${FILTER_MODES.join(", ")}`);
    }
  };

  for (const [position, field] of fields.entries()) {
    const type = String(field.type);
    if (!FIELD_TYPES.includes(type)) {
      problems.push(`${where}.fields[${position}].type must be one of: ${FIELD_TYPES.join(", ")}`);
    }
    if (type === "select" && (!Array.isArray(field.options) || field.options.length === 0)) {
      problems.push(`${where}.fields[${position}] is a select and needs a non-empty options list`);
    }
  }

  requireField(entity.titleField, `${where}.titleField`);

  if (Array.isArray(entity.filters)) {
    for (const [position, filter] of entity.filters.entries()) {
      if (isRecord(filter)) {
        requireField(filter.field, `${where}.filters[${position}]`);
        requireMode(filter.mode, `${where}.filters[${position}]`);
      }
    }
  }

  if (Array.isArray(entity.derived)) {
    for (const [position, derived] of entity.derived.entries()) {
      if (!isRecord(derived)) continue;
      requireField(derived.field, `${where}.derived[${position}]`);
      if (isRecord(derived.where)) {
        requireField(derived.where.field, `${where}.derived[${position}].where`);
        requireMode(derived.where.mode, `${where}.derived[${position}].where`);
      }
      if (derived.kind === "countWhere" && !isRecord(derived.where)) {
        problems.push(`${where}.derived[${position}] is a countWhere and needs a where clause`);
      }
    }
  }

  if (Array.isArray(entity.actions)) {
    const ids = new Set<string>();
    for (const [position, action] of entity.actions.entries()) {
      if (!isRecord(action)) continue;
      const at = `${where}.actions[${position}]`;
      const id = String(action.id);
      if (ids.has(id)) problems.push(`${at} repeats the action id "${id}"`);
      ids.add(id);
      if (action.prompt === undefined && !isRecord(action.sets)) {
        problems.push(`${at} does nothing: give it a prompt, a sets block, or both`);
      }
      requireField(action.prompt, `${at}.prompt`);
      if (isRecord(action.when)) {
        requireField(action.when.field, `${at}.when`);
        requireMode(action.when.mode, `${at}.when`);
      }
      if (isRecord(action.sets)) {
        for (const name of Object.keys(action.sets)) requireField(name, `${at}.sets`);
      }
    }
  }

  if (isRecord(entity.sort)) requireField(entity.sort.field, `${where}.sort`);
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
        continue;
      }
      checkEntityReferences(entity, index, problems);
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
