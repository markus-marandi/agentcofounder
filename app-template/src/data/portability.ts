import type { StoredRecord } from "../kernel/types.js";
import { coerceRecords } from "./coerceRecords.js";
import type { Repository } from "./repository.js";

/**
 * Getting the data out, and back in.
 *
 * This is the practical first step of any move to a database or another
 * service: export the collections, load them on the other side, point the app
 * at an adapter for that store. The envelope is deliberately dull — a version,
 * a timestamp, and one array per collection, matching the schemas in
 * `openapi.json` exactly — so it can be read by something that is not this app.
 *
 * It goes through the repository boundary like everything else, so it works
 * unchanged whatever adapter is underneath.
 */
export const EXPORT_FORMAT_VERSION = 1;

export interface DataExport {
  format: "agent-cofounder-app/export";
  version: number;
  exportedAt: string;
  /** One entry per collection, keyed by the entity name used on the wire. */
  collections: Record<string, StoredRecord[]>;
}

export function exportCollections(repositories: Record<string, Repository>): DataExport {
  const collections: Record<string, StoredRecord[]> = {};
  for (const [name, repository] of Object.entries(repositories)) {
    collections[name] = repository.list();
  }
  return {
    format: "agent-cofounder-app/export",
    version: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    collections,
  };
}

export class ImportFormatError extends Error {
  constructor(detail: string) {
    super(`That file is not an export from this app: ${detail}`);
    this.name = "ImportFormatError";
  }
}

/** Parses and hardens an export. Unknown collections are ignored, not fatal. */
export function readExport(raw: string): DataExport {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ImportFormatError("it is not valid JSON.");
  }
  if (typeof parsed !== "object" || parsed === null) throw new ImportFormatError("it is not an object.");

  const candidate = parsed as Partial<DataExport>;
  if (candidate.format !== "agent-cofounder-app/export") {
    throw new ImportFormatError("the format marker is missing.");
  }
  if (typeof candidate.version !== "number" || candidate.version > EXPORT_FORMAT_VERSION) {
    throw new ImportFormatError(`it was written by a newer version (${String(candidate.version)}).`);
  }
  if (typeof candidate.collections !== "object" || candidate.collections === null) {
    throw new ImportFormatError("it carries no collections.");
  }

  const collections: Record<string, StoredRecord[]> = {};
  for (const [name, records] of Object.entries(candidate.collections)) {
    // The same hardening a stored collection gets: a malformed record is
    // dropped rather than allowed to reach the interface.
    collections[name] = coerceRecords(records);
  }

  return {
    format: "agent-cofounder-app/export",
    version: candidate.version,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : new Date(0).toISOString(),
    collections,
  };
}

/**
 * Replaces each named collection wholesale. Returns how many records landed
 * where, so a caller can say what happened rather than "done".
 */
export function importCollections(
  data: DataExport,
  repositories: Record<string, Repository>,
): Record<string, number> {
  const applied: Record<string, number> = {};
  for (const [name, records] of Object.entries(data.collections)) {
    const repository = repositories[name];
    if (!repository) continue;
    repository.replaceAll(records);
    applied[name] = records.length;
  }
  return applied;
}
