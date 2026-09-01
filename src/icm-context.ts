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

function decisionSeed(value: Record<string, unknown>): Record<string, unknown> {
  const parameters = structuredClone(value);
  delete parameters.route;
  delete parameters.theme;
  delete parameters.components;
  const features = parameters.features as Record<string, unknown> | undefined;
  if (features) parameters.features = { limitations: features.limitations };
  const persistence = parameters.persistence as Record<string, unknown> | undefined;
  if (persistence) parameters.persistence = { namespace: persistence.namespace };
  return parameters;
}

export function compileSingleStageContext(stageContract: string, seedText: string): string {
  const stage = normalizePromptText(stageContract).trim();
  if (!stage) throw new Error("The configure-stage contract is empty");
  const seed = JSON.stringify(decisionSeed(jsonObject(normalizePromptText(seedText))));
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
    model_tools: ["submit_candidate"],
    output: "candidate.json",
  };
}
