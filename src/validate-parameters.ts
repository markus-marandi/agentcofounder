import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv, type ErrorObject } from "ajv";

/**
 * Validates a `parameters.json` against the schema the analyzer skill writes
 * against. Run in CI on the committed seed so a broken contract is caught
 * before a challenge run spends tokens discovering it.
 */

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SOURCE_DIRECTORY, "..");

export async function validateParametersFile(
  parametersPath: string,
  schemaPath: string,
): Promise<string[]> {
  const [parameters, schema] = await Promise.all([
    readFile(parametersPath, "utf8").then((text) => JSON.parse(text) as unknown),
    readFile(schemaPath, "utf8").then((text) => JSON.parse(text) as object),
  ]);

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  if (validate(parameters)) return [];

  return (validate.errors ?? []).map(
    (error: ErrorObject) => `${error.instancePath || "/"} ${error.message ?? "is invalid"}`,
  );
}

async function main(): Promise<void> {
  const [given] = process.argv.slice(2);
  const parametersPath = path.resolve(given ?? path.join(REPOSITORY_ROOT, "app-template", "parameters.json"));
  const schemaPath = path.join(path.dirname(parametersPath), "parameters.schema.json");

  const problems = await validateParametersFile(parametersPath, schemaPath);
  if (problems.length > 0) {
    console.error(`${path.relative(REPOSITORY_ROOT, parametersPath)} does not match its schema:`);
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${path.relative(REPOSITORY_ROOT, parametersPath)} matches its schema.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
