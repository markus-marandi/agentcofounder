import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Checks every skill against the Agent Skills specification that Pi implements
 * (https://agentskills.io/specification): a `SKILL.md` with `name` and
 * `description` frontmatter, and a `name` matching its directory. A violation
 * makes Pi warn at startup, which costs a run.
 *
 * Vendored skills are additionally required to keep their upstream licence.
 */

const SOURCE_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SOURCE_DIRECTORY, "..");
const SKILLS_ROOT = path.join(REPOSITORY_ROOT, "solution", "skills");

export function frontmatterOf(text: string): Record<string, string> | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text);
  const block = match?.[1];
  if (block === undefined) return null;
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/u)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

async function findSkillDirectories(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(current: string): Promise<void> {
    const entries = await readdir(current);
    if (entries.includes("SKILL.md")) {
      found.push(current);
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry);
      if ((await stat(full)).isDirectory()) await walk(full);
    }
  }
  await walk(root);
  return found.sort();
}

export async function lintSkills(root = SKILLS_ROOT): Promise<string[]> {
  const problems: string[] = [];
  const directories = await findSkillDirectories(root);

  if (directories.length === 0) problems.push("No skills found.");

  for (const directory of directories) {
    const relative = path.relative(REPOSITORY_ROOT, directory);
    const fields = frontmatterOf(await readFile(path.join(directory, "SKILL.md"), "utf8"));

    if (!fields) {
      problems.push(`${relative}: SKILL.md has no frontmatter block.`);
      continue;
    }
    if (!fields.name) problems.push(`${relative}: frontmatter is missing "name".`);
    else if (fields.name !== path.basename(directory)) {
      problems.push(`${relative}: name "${fields.name}" does not match its directory.`);
    }
    if (!fields.description) problems.push(`${relative}: frontmatter is missing "description".`);
    else if (fields.description.length < 40) {
      problems.push(`${relative}: description is too short to route on reliably.`);
    }

    if (relative.includes(`${path.sep}vendor${path.sep}`)) {
      const entries = await readdir(directory);
      if (!entries.some((entry) => /^licen[cs]e/iu.test(entry))) {
        problems.push(`${relative}: vendored skill is missing its upstream licence file.`);
      }
    }
  }

  return problems;
}

async function main(): Promise<void> {
  const problems = await lintSkills();
  if (problems.length > 0) {
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log("All skills conform to the Agent Skills specification.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
