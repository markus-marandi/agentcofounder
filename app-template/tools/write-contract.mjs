#!/usr/bin/env node
/**
 * Writes `openapi.json` from `parameters.json`.
 *
 * The delivered app therefore carries a machine-readable description of its own
 * data boundary, generated from the same declaration the interface is built
 * from, so it cannot drift from what the HTTP adapter actually sends.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { openApiDocument } from "./api-contract.mjs";

const appRoot = process.cwd();
const parameters = JSON.parse(await readFile(path.join(appRoot, "parameters.json"), "utf8"));
const document = openApiDocument(parameters);

await writeFile(path.join(appRoot, "openapi.json"), `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.log(
  `Wrote openapi.json: ${Object.keys(document.paths).length} path(s), ${Object.keys(document.components.schemas).length} schema(s).`,
);
