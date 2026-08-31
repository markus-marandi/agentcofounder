import { describe, expect, it } from "vitest";
import { parameters } from "../kernel/config.js";
// @ts-expect-error -- plain ESM generator intentionally has no declaration file.
import { contractMarkdown } from "../../tools/api-contract.mjs";

describe("generated API contract", () => {
  it("documents visible read failures and confirmed-data preservation", () => {
    const markdown = contractMarkdown(parameters);

    expect(markdown).toContain("preserves confirmed data and shows a read error");
    expect(markdown).toContain("Read failures preserve confirmed data");
    expect(markdown).not.toContain("read as an empty collection");
    expect(markdown).not.toContain("A read never throws");
  });
});
