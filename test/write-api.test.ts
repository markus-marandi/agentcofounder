import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const run = promisify(execFile);

it("derives the API entity section from parameters and is idempotent", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-api-"));
  try {
    await writeFile(
      path.join(root, "API.md"),
      "# Boundary\n\n## Entities\n\nstale\n\n## Authentication\n\nKeep this.\n",
      "utf8",
    );
    await writeFile(
      path.join(root, "parameters.json"),
      JSON.stringify({
        entities: [
          {
            name: "book",
            label: "Book",
            labelPlural: "Books",
            titleField: "title",
            fields: [
              { name: "title", label: "Title", type: "text", required: true },
              { name: "borrower", label: "Borrower", type: "text" },
            ],
            filters: [{ field: "borrower", label: "Currently out", mode: "truthy" }],
            actions: [{ id: "return", label: "Mark returned" }],
            derived: [{ id: "out", label: "Out", kind: "countWhere" }],
          },
        ],
      }),
      "utf8",
    );

    const script = path.resolve("app-template/tools/write-api.mjs");
    await run(process.execPath, [script], { cwd: root });
    const first = await readFile(path.join(root, "API.md"), "utf8");
    await run(process.execPath, [script], { cwd: root });
    const second = await readFile(path.join(root, "API.md"), "utf8");

    expect(first).toBe(second);
    expect(first).toContain("### Books (`book`)");
    expect(first).toContain("`borrower` (Borrower)");
    expect(first).toContain("`Currently out (truthy borrower)`");
    expect(first).toContain("`Mark returned (return)`");
    expect(first).toContain("## Authentication\n\nKeep this.");
    expect(first).not.toContain("stale");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
