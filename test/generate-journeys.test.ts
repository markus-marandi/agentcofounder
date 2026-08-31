import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const run = promisify(execFile);
const script = path.resolve("app-template/tools/generate-journeys.mjs");

describe("deterministic journey generator", () => {
  it("addresses checkbox filters precisely and reaches action-owned date state through its action", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-journeys-"));
    try {
      await mkdir(path.join(root, "src"));
      await writeFile(
        path.join(root, "parameters.json"),
        JSON.stringify({
          product: { name: "Tool Shelf" },
          entities: [
            {
              name: "tool",
              label: "Tool",
              labelPlural: "Tools",
              titleField: "name",
              fields: [
                { name: "name", label: "Tool name", type: "text", required: true },
                { name: "isOut", label: "Checked out", type: "boolean", required: true },
                { name: "borrower", label: "Borrower", type: "text" },
                { name: "dueBack", label: "Due back", type: "date" },
              ],
              filters: [
                { field: "isOut", label: "Out now", mode: "truthy" },
                { field: "dueBack", label: "Overdue", mode: "beforeToday" },
              ],
              actions: [
                {
                  id: "lend",
                  label: "Lend tool",
                  prompt: "borrower",
                  sets: { isOut: true },
                  when: { field: "isOut", mode: "falsy" },
                },
                {
                  id: "set-due-date",
                  label: "Set due date",
                  prompt: "dueBack",
                  sets: {},
                  when: { field: "isOut", mode: "truthy" },
                },
              ],
            },
          ],
          features: { search: false },
        }),
        "utf8",
      );

      await run(process.execPath, [script], { cwd: root });
      const generated = await readFile(path.join(root, "src", "journeys.generated.test.tsx"), "utf8");

      expect(generated).toContain('user.click(filterControl("Out now", "isOut"))');
      expect(generated).not.toContain("with no checked out");
      expect(generated).not.toContain('"label":"Checked out *"');
      const overdueStart = generated.indexOf('it("narrows the collection with the Overdue filter"');
      const overdueEnd = generated.indexOf("\n  });", overdueStart);
      const overdueJourney = generated.slice(overdueStart, overdueEnd);
      const lend = overdueJourney.indexOf('rowAction(user, "Lend tool"');
      const due = overdueJourney.indexOf('rowAction(user, "Set due date"');
      expect(lend).toBeGreaterThan(-1);
      expect(due).toBeGreaterThan(lend);
      expect(generated).toContain('"2000-01-01"');
      expect(generated).toContain('"2999-01-01"');
      expect(generated).not.toContain('addRecord(user, {"name":"Tool name 1","dueBack"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
