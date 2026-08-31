import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const script = path.resolve("app-template/tools/materialize-candidate.mjs");

describe("candidate materializer", () => {
  it("splits one model-owned candidate into the two kernel inputs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-candidate-"));
    try {
      const candidate = {
        idea_spec: {
          target_user: "A collector",
          assumptions: ["One browser-local user."],
        },
        parameters: {
          route: "web-app",
          product: { name: "Shelf", tagline: "Know what you own." },
        },
      };
      await writeFile(path.join(root, "candidate.json"), JSON.stringify(candidate), "utf8");

      await run(process.execPath, [script], { cwd: root });

      expect(JSON.parse(await readFile(path.join(root, "idea_spec.json"), "utf8"))).toEqual(
        candidate.idea_spec,
      );
      expect(JSON.parse(await readFile(path.join(root, "parameters.json"), "utf8"))).toEqual(
        candidate.parameters,
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed when the candidate contains an invalid idea spec", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-candidate-invalid-"));
    try {
      await writeFile(
        path.join(root, "candidate.json"),
        JSON.stringify({
          idea_spec: { target_user: "A collector", assumptions: "One browser-local user." },
          parameters: {},
        }),
        "utf8",
      );

      await expect(run(process.execPath, [script], { cwd: root })).rejects.toThrow();
      await expect(readFile(path.join(root, "idea_spec.json"), "utf8")).rejects.toThrow();
      await expect(readFile(path.join(root, "parameters.json"), "utf8")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
