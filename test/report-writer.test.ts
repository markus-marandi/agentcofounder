import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";

it("runs the pinned Vitest JavaScript entry point without a platform shell shim", async () => {
  const source = await readFile(path.resolve("app-template/tools/write-report.mjs"), "utf8");

  expect(source).toContain("process.execPath");
  expect(source).toContain('"vitest.mjs"');
  expect(source).toContain("process.argv.slice(2)");
  expect(source).toContain("suppliedResults");
  expect(source).not.toContain("npx.cmd");
});
