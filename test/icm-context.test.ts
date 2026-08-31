import { describe, expect, it } from "vitest";
import { compileSingleStageContext } from "../src/icm-context.js";

describe("single-stage compiled ICM context", () => {
  it("normalizes the stage and minifies the valid structural seed", () => {
    const stage = "# Configure\r\n\r\nWrite one candidate.\r\n";
    const seed = "{\r\n  \"route\": \"web-app\",\r\n  \"entities\": []\r\n}\r\n";

    const compiled = compileSingleStageContext(stage, seed);

    expect(compiled).not.toContain("\r");
    expect(compiled).toContain("# Configure\n\nWrite one candidate.");
    expect(compiled).toContain('{"route":"web-app","entities":[]}');
    expect(compiled).toContain("## Valid structural seed");
    expect(compiled.length).toBeLessThan(stage.length + seed.length + 80);
  });

  it("rejects a seed that cannot be compiled as a JSON object", () => {
    expect(() => compileSingleStageContext("# Configure", "[]")).toThrow(/JSON object/iu);
    expect(() => compileSingleStageContext("# Configure", "not json")).toThrow(/valid JSON/iu);
  });
});
