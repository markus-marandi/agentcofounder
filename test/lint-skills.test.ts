import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { frontmatterOf, lintSkills } from "../src/lint-skills.js";
import { condense } from "../solution/extensions/verify-loop.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  while (temporaryDirectories.length > 0) {
    const directory = temporaryDirectories.pop();
    if (directory) await rm(directory, { recursive: true, force: true });
  }
});

async function skillRoot(skills: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-skills-"));
  temporaryDirectories.push(root);
  for (const [name, body] of Object.entries(skills)) {
    await mkdir(path.join(root, name), { recursive: true });
    await writeFile(path.join(root, name, "SKILL.md"), body, "utf8");
  }
  return root;
}

const description = "A description long enough for an agent to route on with some confidence.";

describe("skill linting", () => {
  it("accepts every committed skill", async () => {
    expect(await lintSkills()).toEqual([]);
  });

  it("rejects a skill whose name does not match its directory", async () => {
    const root = await skillRoot({ alpha: `---\nname: beta\ndescription: ${description}\n---\n` });
    expect((await lintSkills(root)).join(" ")).toContain("does not match its directory");
  });

  it("rejects a missing description and a description too short to route on", async () => {
    const root = await skillRoot({
      alpha: "---\nname: alpha\n---\n",
      beta: "---\nname: beta\ndescription: short\n---\n",
    });
    const problems = (await lintSkills(root)).join(" ");
    expect(problems).toContain('missing "description"');
    expect(problems).toContain("too short");
  });

  it("rejects a SKILL.md with no frontmatter at all", async () => {
    const root = await skillRoot({ alpha: "# Alpha\n" });
    expect((await lintSkills(root)).join(" ")).toContain("no frontmatter");
  });

  it("requires a vendored skill to keep its upstream licence", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-skills-"));
    temporaryDirectories.push(root);
    await mkdir(path.join(root, "vendor", "borrowed"), { recursive: true });
    await writeFile(
      path.join(root, "vendor", "borrowed", "SKILL.md"),
      `---\nname: borrowed\ndescription: ${description}\n---\n`,
      "utf8",
    );
    expect((await lintSkills(root)).join(" ")).toContain("missing its upstream licence");
  });

  it("reads frontmatter fields and returns null when the block is absent", () => {
    expect(frontmatterOf("---\nname: a\ndescription: b\n---\nbody")).toEqual({ name: "a", description: "b" });
    expect(frontmatterOf("no frontmatter")).toBeNull();
  });
});

describe("verify-loop output condensing", () => {
  it("keeps the lines that name a failure and drops the scaffolding", () => {
    const output = [
      "RUN v4.1.5",
      "  ✓ src/a.test.ts > passes",
      "  × src/b.test.ts > adds a record",
      "AssertionError: expected 1 to be 2",
      "Duration 1.2s",
    ].join("\n");

    const condensed = condense(output);
    expect(condensed).toContain("adds a record");
    expect(condensed).toContain("expected 1 to be 2");
    expect(condensed).not.toContain("RUN v4.1.5");
  });

  it("falls back to the last non-empty lines when nothing looks like a failure", () => {
    expect(condense("alpha\n\nbeta")).toBe("alpha\nbeta");
  });

  it("truncates output that would otherwise flood the context", () => {
    const condensed = condense(`${"error here\n".repeat(500)}`, 200);
    expect(condensed.length).toBeLessThan(260);
    expect(condensed.startsWith("…")).toBe(true);
  });

  it("keeps the parameters problems, which carry none of the words the generic filter looks for", () => {
    const condensed = condense(
      [
        "vite v7.3.6 building client environment for production...",
        "Invalid parameters.json:",
        '- entities[0].filters[0] names field "ghost", which entities[0] does not declare',
        "- entities[0].actions[1] does nothing: give it a prompt, a sets block, or both",
        "    at loadConfig (/app/src/kernel/config.ts:1:1)",
      ].join("\n"),
    );
    expect(condensed).toContain("ghost");
    expect(condensed).toContain("does nothing");
    expect(condensed).not.toContain("loadConfig");
  });
});
