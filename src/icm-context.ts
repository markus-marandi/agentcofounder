import { createHash } from "node:crypto";

function normalizePromptText(text: string): string {
  return text.replace(/\r\n?/gu, "\n");
}

function jsonObject(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`The structural seed is not valid JSON: ${String(error)}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("The structural seed must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

export function compileSingleStageContext(stageContract: string, seedText: string): string {
  const stage = normalizePromptText(stageContract).trim();
  if (!stage) throw new Error("The configure-stage contract is empty");
  const seed = JSON.stringify(jsonObject(normalizePromptText(seedText)));
  return `${stage}\n\n## Valid structural seed\n\n${seed}\n`;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function compiledContextManifest(
  stageContract: string,
  seedText: string,
  compiledContext: string,
): Record<string, unknown> {
  return {
    methodology: "icm-compiled-single-stage-v1",
    stage: "configure-product",
    sources: [
      { id: "configure-stage", sha256: sha256(normalizePromptText(stageContract)) },
      { id: "parameters-seed", sha256: sha256(normalizePromptText(seedText)) },
    ],
    compiled_sha256: sha256(compiledContext),
    compiled_characters: compiledContext.length,
    model_tools: ["write"],
    output: "candidate.json",
  };
}
