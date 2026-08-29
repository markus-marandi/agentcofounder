import { writeFile } from "node:fs/promises";
import path from "node:path";
import type { PartialRunResult, TestRun } from "./types.js";

const FIELD_TYPES = ["text", "longtext", "number", "date", "select", "boolean"] as const;
const FILTER_MODES = ["equals", "truthy", "falsy", "contains", "beforeToday"] as const;
const DERIVED_KINDS = ["count", "countWhere", "sum", "average", "min", "max", "distinct"] as const;
const THEMES = [
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
] as const;

type FieldType = (typeof FIELD_TYPES)[number];
type FilterMode = (typeof FILTER_MODES)[number];
type DerivedKind = (typeof DERIVED_KINDS)[number];
type Theme = (typeof THEMES)[number];

export interface ProductFieldDecision {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface ProductFilterDecision {
  field: string;
  label: string;
  mode: FilterMode;
  value?: string | number | boolean;
}

export interface ProductDerivedDecision {
  id: string;
  label: string;
  kind: DerivedKind;
  field?: string;
  where?: {
    field: string;
    mode: FilterMode;
    value?: string | number | boolean;
  };
}

export interface ProductDecision {
  name: string;
  tagline: string;
  entity: {
    name: string;
    singular: string;
    plural: string;
    titleField: string;
    fields: ProductFieldDecision[];
  };
  filters: ProductFilterDecision[];
  derived: ProductDerivedDecision[];
  theme: Theme;
  search: boolean;
  namespace: string;
  assumptions: string[];
  limitations: string[];
}

export const PRODUCT_DECISION_SYSTEM_PROMPT = `Turn the idea into one offline record app. Return JSON only, no prose:
{"p":"Product","t":"Value","e":{"s":"Record","p":"Records","h":"title","f":[["title","Title","text",1],["kind","Kind","select",1,["A","B"]]]},"q":[["kind","Kind","equals"]],"d":[["Total","count"]],"a":"Resolve one ambiguity","l":[]}
Keys: p product; t tagline; e entity; s/p singular/plural; h title field; f fields [camelName,label,type,required0or1,options?]; q filters [field,label,mode]; d derived [label,kind,field?,mode?]; a one assumption; l unsupported idea-specific limits.
Types: text,longtext,number,date,select,boolean. Filter modes: equals,truthy,falsy,contains,beforeToday. Derived: count,countWhere,sum,average,min,max,distinct. Use 1-12 fields; h is required text; select needs options; references name fields; include q and d.`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(nonEmptyString);
}

function slug(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase();
}

function camelName(value: unknown): string {
  const parts = String(value ?? "").normalize("NFKD").match(/[a-zA-Z0-9]+/gu) ?? [];
  return parts
    .map((part, index) => index === 0
      ? `${part[0]?.toLowerCase() ?? ""}${part.slice(1)}`
      : `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join("");
}

function themeFor(namespace: string): Theme {
  const index = [...namespace].reduce((sum, character) => sum + character.codePointAt(0)!, 0) % THEMES.length;
  return THEMES[index]!;
}

function expandCompactDecision(value: unknown): unknown {
  if (!isRecord(value) || !("p" in value) || !isRecord(value.e)) return value;
  const entity = value.e;
  const productName = value.p;
  const namespace = slug(productName);
  const fields = Array.isArray(entity.f)
    ? entity.f.map((raw) => {
      if (!Array.isArray(raw)) return raw;
      const field: Record<string, unknown> = {
        name: raw[0],
        label: raw[1],
        type: raw[2],
        required: raw[3] === 1,
      };
      if (raw[4] !== undefined) field.options = raw[4];
      return field;
    })
    : entity.f;
  const filters = Array.isArray(value.q)
    ? value.q.map((raw) => Array.isArray(raw)
      ? { field: raw[0], label: raw[1], mode: raw[2] }
      : raw)
    : value.q;
  const derived = Array.isArray(value.d)
    ? value.d.map((raw) => {
      if (!Array.isArray(raw)) return raw;
      const item: Record<string, unknown> = { id: slug(raw[0]), label: raw[0], kind: raw[1] };
      if (raw[1] === "countWhere") {
        item.where = { field: raw[2], mode: raw[3] };
      } else if (raw[2] !== undefined) {
        item.field = raw[2];
      }
      return item;
    })
    : value.d;
  return {
    name: productName,
    tagline: value.t,
    entity: {
      name: camelName(entity.s),
      singular: entity.s,
      plural: entity.p,
      titleField: entity.h,
      fields,
    },
    filters,
    derived,
    theme: themeFor(namespace),
    search: true,
    namespace,
    assumptions: nonEmptyString(value.a) ? [value.a] : value.a,
    limitations: value.l,
  };
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T): value is T[number] {
  return typeof value === "string" && allowed.includes(value);
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    // Models occasionally wrap an otherwise valid object in a short preface or fence.
  }

  const start = trimmed.indexOf("{");
  if (start < 0) throw new Error("The model response did not contain a JSON object");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === "\"") inString = false;
      continue;
    }
    if (character === "\"") {
      inString = true;
      continue;
    }
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return JSON.parse(trimmed.slice(start, index + 1)) as unknown;
    }
  }
  throw new Error("The model response contained an incomplete JSON object");
}

function validateField(value: unknown, index: number, errors: string[]): ProductFieldDecision | undefined {
  if (!isRecord(value)) {
    errors.push(`entity.fields[${index}] must be an object`);
    return undefined;
  }
  if (!nonEmptyString(value.name) || !/^[a-z][a-zA-Z0-9]*$/u.test(value.name)) {
    errors.push(`entity.fields[${index}].name must be camelCase`);
  }
  if (!nonEmptyString(value.label)) errors.push(`entity.fields[${index}].label is required`);
  if (!oneOf(value.type, FIELD_TYPES)) errors.push(`entity.fields[${index}].type is unsupported`);
  if (typeof value.required !== "boolean") errors.push(`entity.fields[${index}].required must be boolean`);
  if (value.type === "select" && (!stringArray(value.options) || value.options.length === 0)) {
    errors.push(`entity.fields[${index}].options are required for a select`);
  }
  if (value.options !== undefined && !stringArray(value.options)) errors.push(`entity.fields[${index}].options must be strings`);
  if (value.min !== undefined && typeof value.min !== "number") errors.push(`entity.fields[${index}].min must be a number`);
  if (value.max !== undefined && typeof value.max !== "number") errors.push(`entity.fields[${index}].max must be a number`);
  if (errors.some((error) => error.startsWith(`entity.fields[${index}]`))) return undefined;
  const field: ProductFieldDecision = {
    name: value.name as string,
    label: value.label as string,
    type: value.type as FieldType,
    required: value.required as boolean,
  };
  if (stringArray(value.options)) field.options = value.options;
  if (typeof value.min === "number") field.min = value.min;
  if (typeof value.max === "number") field.max = value.max;
  return field;
}

export function parseProductDecision(text: string): ProductDecision {
  const value = expandCompactDecision(extractJsonObject(text));
  const errors: string[] = [];
  if (!isRecord(value)) throw new Error("The product decision must be a JSON object");
  if (!nonEmptyString(value.name) || value.name.length > 60) errors.push("name must be 1-60 characters");
  if (!nonEmptyString(value.tagline) || value.tagline.length > 160) errors.push("tagline must be 1-160 characters");
  if (!isRecord(value.entity)) errors.push("entity must be an object");
  const entity = isRecord(value.entity) ? value.entity : {};
  if (!nonEmptyString(entity.name) || !/^[a-z][a-zA-Z0-9]*$/u.test(entity.name)) errors.push("entity.name must be camelCase");
  if (!nonEmptyString(entity.singular)) errors.push("entity.singular is required");
  if (!nonEmptyString(entity.plural)) errors.push("entity.plural is required");
  if (!nonEmptyString(entity.titleField)) errors.push("entity.titleField is required");
  if (!Array.isArray(entity.fields) || entity.fields.length === 0 || entity.fields.length > 12) {
    errors.push("entity.fields must contain 1-12 fields");
  }
  const fields = Array.isArray(entity.fields)
    ? entity.fields.map((field, index) => validateField(field, index, errors)).filter((field): field is ProductFieldDecision => field !== undefined)
    : [];
  const fieldNames = new Set(fields.map((field) => field.name));
  if (fieldNames.size !== fields.length) errors.push("entity field names must be unique");
  if (nonEmptyString(entity.titleField) && !fieldNames.has(entity.titleField)) errors.push("entity.titleField must reference a field");
  const titleField = fields.find((field) => field.name === entity.titleField);
  if (titleField && (!titleField.required || !["text", "longtext"].includes(titleField.type))) {
    errors.push("entity.titleField must reference a required text field");
  }

  if (!Array.isArray(value.filters) || value.filters.length === 0) errors.push("filters must contain at least one filter");
  const filters: ProductFilterDecision[] = [];
  if (Array.isArray(value.filters)) {
    for (const [index, raw] of value.filters.entries()) {
      if (!isRecord(raw) || !nonEmptyString(raw.field) || !nonEmptyString(raw.label) || !oneOf(raw.mode, FILTER_MODES)) {
        errors.push(`filters[${index}] is invalid`);
        continue;
      }
      if (!fieldNames.has(raw.field)) errors.push(`filters[${index}].field must reference a field`);
      const filter: ProductFilterDecision = { field: raw.field, label: raw.label, mode: raw.mode };
      if (["string", "number", "boolean"].includes(typeof raw.value)) filter.value = raw.value as string | number | boolean;
      filters.push(filter);
    }
  }

  if (!Array.isArray(value.derived) || value.derived.length === 0) errors.push("derived must contain at least one value");
  const derived: ProductDerivedDecision[] = [];
  if (Array.isArray(value.derived)) {
    for (const [index, raw] of value.derived.entries()) {
      if (!isRecord(raw) || !nonEmptyString(raw.id) || !/^[a-z0-9-]+$/u.test(raw.id) || !nonEmptyString(raw.label) || !oneOf(raw.kind, DERIVED_KINDS)) {
        errors.push(`derived[${index}] is invalid`);
        continue;
      }
      const item: ProductDerivedDecision = { id: raw.id, label: raw.label, kind: raw.kind };
      if (nonEmptyString(raw.field)) {
        if (!fieldNames.has(raw.field)) errors.push(`derived[${index}].field must reference a field`);
        item.field = raw.field;
      }
      if (isRecord(raw.where) && nonEmptyString(raw.where.field) && oneOf(raw.where.mode, FILTER_MODES)) {
        if (!fieldNames.has(raw.where.field)) errors.push(`derived[${index}].where.field must reference a field`);
        item.where = { field: raw.where.field, mode: raw.where.mode };
        if (["string", "number", "boolean"].includes(typeof raw.where.value)) {
          item.where.value = raw.where.value as string | number | boolean;
        }
      } else if (raw.kind === "countWhere") {
        errors.push(`derived[${index}].where is required for countWhere`);
      }
      derived.push(item);
    }
  }

  if (!oneOf(value.theme, THEMES)) errors.push("theme is unsupported");
  if (typeof value.search !== "boolean") errors.push("search must be boolean");
  if (!nonEmptyString(value.namespace) || !/^[a-z0-9-]+$/u.test(value.namespace)) errors.push("namespace must be lowercase hyphenated text");
  if (!stringArray(value.assumptions) || value.assumptions.length === 0) errors.push("assumptions must contain an ambiguity decision");
  if (!Array.isArray(value.limitations) || !value.limitations.every(nonEmptyString)) errors.push("limitations must be an array of strings");
  if (errors.length > 0) throw new Error(errors.join("; "));

  return {
    name: value.name as string,
    tagline: value.tagline as string,
    entity: {
      name: entity.name as string,
      singular: entity.singular as string,
      plural: entity.plural as string,
      titleField: entity.titleField as string,
      fields,
    },
    filters,
    derived,
    theme: value.theme as Theme,
    search: value.search as boolean,
    namespace: value.namespace as string,
    assumptions: value.assumptions as string[],
    limitations: value.limitations as string[],
  };
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function compileParameters(decision: ProductDecision): Record<string, unknown> {
  const limitations = [
    "Data is stored in this browser only. It does not sync between devices or people.",
    "Clearing browser storage for this site permanently removes every record.",
    ...decision.limitations,
  ];
  return {
    route: "web-app",
    product: { name: decision.name, tagline: decision.tagline },
    theme: { preset: decision.theme, density: "comfortable" },
    navigation: [
      { id: "showcase", label: "Home", kind: "showcase" },
      { id: "collection", label: decision.entity.plural, kind: "collection", entity: decision.entity.name },
    ],
    entities: [{
      name: decision.entity.name,
      label: decision.entity.singular,
      labelPlural: decision.entity.plural,
      titleField: decision.entity.titleField,
      fields: decision.entity.fields.map((field) => withoutUndefined({ ...field })),
      filters: decision.filters.map((filter) => ({ field: filter.field, label: filter.label, mode: filter.mode })),
      derived: decision.derived.map((item) => withoutUndefined({ ...item, where: item.where ? withoutUndefined({ ...item.where }) : undefined })),
    }],
    features: { search: decision.search, auth: false, limitations: [...new Set(limitations)] },
    persistence: { adapter: "localStorage", namespace: decision.namespace },
    showcase: { blocks: ["home-screen-sidebar"] },
  };
}

export function journeyDescriptions(decision: ProductDecision): string[] {
  return [
    `adds a complete ${decision.entity.singular.toLowerCase()} and sees it in the list`,
    `rejects a ${decision.entity.singular.toLowerCase()} missing a required field`,
    `edits an existing ${decision.entity.singular.toLowerCase()}`,
    `deletes an existing ${decision.entity.singular.toLowerCase()} after confirmation`,
    ...decision.filters.map((filter) => `narrows ${decision.entity.plural.toLowerCase()} using ${filter.label}`),
    `updates configured derived values for the visible ${decision.entity.plural.toLowerCase()}`,
    `preserves ${decision.entity.plural.toLowerCase()} across a page refresh`,
  ];
}

export function deterministicPartialResult(decision: ProductDecision, verified: boolean): PartialRunResult {
  const result: TestRun["result"] = verified ? "passed" : "failed";
  return {
    status: verified ? "success" : "partial",
    app_url: "http://localhost:3000",
    start_command: "npm run dev",
    summary: `${decision.name} turns the supplied idea into a focused browser application.`,
    implemented_features: [
      `${decision.entity.singular} create, edit, and delete`,
      ...decision.filters.map((filter) => filter.label),
      ...decision.derived.map((item) => item.label),
      "Browser persistence",
    ],
    assumptions: decision.assumptions,
    tests_run: journeyDescriptions(decision).map((journey) => ({ command: "npm test", journey, result })),
  };
}

export function renderApiDocumentation(decision: ProductDecision): string {
  const fields = decision.entity.fields
    .map((field) => `| \`${field.name}\` | ${field.label} | ${field.type} | ${field.required ? "yes" : "no"} |`)
    .join("\n");
  return `# Application data boundary

${decision.name} is an offline browser application. It exposes no HTTP endpoint and sends no data over the network.

## ${decision.entity.plural}

All reads and mutations go through the repository interface in \`src/data/repository.ts\`. The active adapter stores records in browser localStorage under the \`${decision.namespace}\` namespace.

| Field | Label | Type | Required |
|---|---|---|---|
${fields}

## Operations

- List, create, update, and delete ${decision.entity.plural.toLowerCase()}.
- Apply ${decision.filters.map((filter) => filter.label).join(", ")} filtering.
- Compute ${decision.derived.map((item) => item.label).join(", ")} from repository records.

## Integration seam

Replace the StorageAdapter to connect a future service. Components do not access localStorage directly. A production adapter must add authentication, authorization, server-side validation, concurrency control, and durable migrations.
`;
}

export async function materializeDecision(outputDirectory: string, decision: ProductDecision): Promise<void> {
  await Promise.all([
    writeFile(path.join(outputDirectory, "parameters.json"), `${JSON.stringify(compileParameters(decision), null, 2)}\n`, "utf8"),
    writeFile(path.join(outputDirectory, "API.md"), renderApiDocumentation(decision), "utf8"),
    writeFile(path.join(outputDirectory, "decision.json"), `${JSON.stringify(decision, null, 2)}\n`, "utf8"),
  ]);
}
