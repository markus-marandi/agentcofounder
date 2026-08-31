/**
 * Derives this app's integration contract from `parameters.json`.
 *
 * The entities are declared in one place, so the wire format, the record
 * schema and the table definition are consequences of that declaration rather
 * than prose someone has to keep in step. Three outputs, one source:
 *
 *   openApiDocument()  the HTTP contract `createHttpAdapter` already speaks
 *   entitySchema()     JSON Schema per entity, for validation on either side
 *   postgresTable()    the table a database-backed adapter would read and write
 *
 * `npm run contract` writes the first to `openapi.json`; `/api-docs` renders
 * all three. Nothing here runs in the browser or touches a network.
 */

/** How a declared field type crosses each boundary. */
const FIELD_TYPES = {
  text: { json: { type: "string" }, sql: "text", note: "Free text." },
  longtext: { json: { type: "string" }, sql: "text", note: "Free text, multi-line." },
  number: { json: { type: ["number", "null"] }, sql: "numeric", note: "Null when left blank." },
  date: { json: { type: ["string", "null"], format: "date" }, sql: "date", note: "ISO 8601 calendar date." },
  select: { json: { type: "string" }, sql: "text", note: "One of a closed set." },
  combobox: { json: { type: "string" }, sql: "text", note: "Open set; suggestions are not a constraint." },
  boolean: { json: { type: "boolean" }, sql: "boolean", note: "Always present; defaults to false." },
};

function typeOf(field) {
  return FIELD_TYPES[field.type] ?? FIELD_TYPES.text;
}

export function collectionOf(entity) {
  return entity.name;
}

/** JSON Schema for one stored record, kernel fields included. */
export function entitySchema(entity) {
  const properties = {
    id: { type: "string", description: "Assigned by the store. Immutable." },
    createdAt: { type: "string", format: "date-time", description: "Assigned by the store. Immutable." },
  };
  for (const field of entity.fields) {
    const mapped = typeOf(field);
    const schema = { ...mapped.json, description: field.help ?? mapped.note };
    if (field.type === "select" && Array.isArray(field.options)) schema.enum = field.options;
    if (field.type === "number") {
      if (typeof field.min === "number") schema.minimum = field.min;
      if (typeof field.max === "number") schema.maximum = field.max;
    }
    properties[field.name] = schema;
  }

  const required = ["id", "createdAt", ...entity.fields.filter((field) => field.required).map((field) => field.name)];

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: `#/components/schemas/${entity.name}`,
    title: entity.label,
    type: "object",
    additionalProperties: true,
    required,
    properties,
  };
}

/**
 * The table a SQL-backed adapter would use. A sketch on purpose: it shows the
 * field-to-column mapping the app already implies, not a migration to run.
 */
export function postgresTable(entity) {
  const lines = [
    `create table ${entity.name} (`,
    "  id          text primary key,",
    "  created_at  timestamptz not null default now(),",
  ];
  const width = Math.max(...entity.fields.map((field) => field.name.length), 10);
  for (const field of entity.fields) {
    const nullable = field.required ? " not null" : "";
    lines.push(`  ${field.name.padEnd(width)}  ${typeOf(field).sql}${nullable},`);
  }
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/u, "");
  lines.push(");");

  const indexes = [];
  for (const filter of entity.filters ?? []) {
    indexes.push(`create index on ${entity.name} (${filter.field});  -- filter: ${filter.label}`);
  }
  if (entity.sort) {
    indexes.push(`create index on ${entity.name} (${entity.sort.field} ${entity.sort.direction === "desc" ? "desc" : "asc"});  -- resting order`);
  }
  return [lines.join("\n"), ...indexes].join("\n");
}

/**
 * The HTTP contract, describing exactly what `createHttpAdapter` sends — not an
 * aspirational API. A collection is read whole and written whole, because the
 * collection is the unit the repository owns.
 */
export function openApiDocument(parameters) {
  const product = parameters.product ?? {};
  const entities = parameters.entities ?? [];
  const paths = {};
  const schemas = {};

  for (const entity of entities) {
    const collection = collectionOf(entity);
    schemas[entity.name] = entitySchema(entity);
    const arraySchema = { type: "array", items: { $ref: `#/components/schemas/${entity.name}` } };

    paths[`/${collection}`] = {
      get: {
        summary: `All ${entity.labelPlural?.toLowerCase() ?? `${entity.label} records`}`,
        operationId: `list${entity.label.replace(/\W/gu, "")}`,
        responses: {
          200: { description: "The collection.", content: { "application/json": { schema: arraySchema } } },
        },
      },
      put: {
        summary: `Replace all ${entity.labelPlural?.toLowerCase() ?? `${entity.label} records`}`,
        description:
          "The repository owns the whole collection and sends it whole. Any 2xx is accepted; " +
          "any other status is a rejection, and the app rolls the change back and tells the user.",
        operationId: `replace${entity.label.replace(/\W/gu, "")}`,
        requestBody: { required: true, content: { "application/json": { schema: arraySchema } } },
        responses: {
          204: { description: "Stored." },
          409: { description: "Rejected; the app restores what it showed before." },
          503: { description: "Store unavailable; same handling as 409." },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${product.name ?? "This app"} — data boundary`,
      version: "1.0.0",
      summary: product.tagline,
      description:
        "The contract between this app's repository and any store behind it. " +
        "The app ships with a localStorage adapter and makes no network calls; " +
        "`src/data/httpAdapter.ts` speaks exactly this contract, and passes the same " +
        "adapter conformance suite as the local adapters.",
    },
    servers: [{ url: "/api", description: "Wherever createHttpAdapter is pointed." }],
    paths,
    components: { schemas },
  };
}

/** The whole contract as Markdown, appended to API.md on the docs page. */
export function contractMarkdown(parameters) {
  const entities = parameters.entities ?? [];
  const out = [];

  out.push("## HTTP contract");
  out.push("");
  out.push(
    "This app stores records in the browser and makes no network calls. It is nonetheless " +
      "ready for one: `src/data/httpAdapter.ts` implements the boundary over HTTP and passes " +
      "the same conformance suite as the local adapters, so pointing this app at a service is " +
      "a one-line change in `src/kernel/useRepository.ts`. The contract below is generated from " +
      "`parameters.json`, and `openapi.json` carries the machine-readable version.",
  );
  out.push("");
  out.push("```ts");
  out.push('// src/kernel/useRepository.ts — the whole change');
  out.push('export const adapter = createHttpAdapter("/api", {');
  out.push("  headers: { authorization: `Bearer ${token}` },");
  out.push("  timeoutMs: 10_000,");
  out.push("});");
  out.push("```");
  out.push("");

  for (const entity of entities) {
    const collection = collectionOf(entity);
    out.push(`### \`${collection}\``);
    out.push("");
    out.push("| Method | Path | Body | Success | Failure |");
    out.push("|---|---|---|---|---|");
    out.push(`| GET | \`/api/${collection}\` | — | \`200\` with a JSON array of records | non-2xx or a malformed collection preserves confirmed data and shows a read error |`);
    out.push(`| PUT | \`/api/${collection}\` | the full JSON array | \`2xx\` | any other status rolls the change back and tells the user |`);
    out.push("");
    out.push(`**Record shape** — \`${entity.label}\`:`);
    out.push("");
    out.push("```json");
    out.push(JSON.stringify(entitySchema(entity), null, 2));
    out.push("```");
    out.push("");
    out.push("**As a table** — the mapping a SQL-backed adapter would use:");
    out.push("");
    out.push("```sql");
    out.push(postgresTable(entity));
    out.push("```");
    out.push("");
  }

  out.push("### Record-level REST instead");
  out.push("");
  out.push(
    "A service that prefers `POST`/`PATCH`/`DELETE` per record is the same seam: the adapter " +
      "keeps the last collection it read and sends the difference. It is the only file that changes.",
  );
  out.push("");
  out.push("```ts");
  out.push("write(collection, records) {");
  out.push("  const before = new Map(lastRead.map((record) => [record.id, record]));");
  out.push("  for (const record of records) {");
  out.push("    const previous = before.get(record.id);");
  out.push("    if (!previous) await post(`/${collection}`, record);");
  out.push("    else if (previous !== record) await patch(`/${collection}/${record.id}`, record);");
  out.push("    before.delete(record.id);");
  out.push("  }");
  out.push("  for (const id of before.keys()) await del(`/${collection}/${id}`);");
  out.push("}");
  out.push("```");
  out.push("");

  out.push("## What the boundary guarantees");
  out.push("");
  out.push("- **A store may answer late.** `StorageAdapter` returns `T | Promise<T>`; the repository keeps a synchronous cache so views never learn whether the store is local or remote.");
  out.push("- **A change is shown, then confirmed.** Writes apply optimistically and roll back if the store rejects them, and the rejection reaches the user through `repository.onError`.");
  out.push("- **Writes keep their order.** They are queued, so a store answering out of order cannot let an older collection overwrite a newer one.");
  out.push("- **Read failures preserve confirmed data.** An unreachable service, a non-2xx response, or a malformed collection reaches the user as a clean error; an initial failure starts empty without crashing the view.");
  out.push("- **`id` and `createdAt` belong to the store.** No caller can overwrite them.");
  out.push("- **Not merged.** The repository is local-first and does not reconcile concurrent remote edits: a read that lands after a local change is dropped rather than allowed to undo it. A store needing merge semantics does the merging inside its adapter — the same seam, still nothing above it.");
  out.push("");

  return out.join("\n");
}
