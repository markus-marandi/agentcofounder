import { type ExtensionAPI, withFileMutationQueue } from "@earendil-works/pi-coding-agent";
import { readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Type, type Static } from "typebox";

export const SUBMIT_CANDIDATE_TOOL_NAME = "submit_candidate";

const jsonObject = Type.Object({}, { additionalProperties: true });

export const candidateToolParameters = Type.Object(
  {
    idea_spec: Type.Object(
      {
        target_user: Type.String({ minLength: 1 }),
        assumptions: Type.Array(Type.String({ minLength: 1 })),
      },
      { additionalProperties: false },
    ),
    parameters: Type.Object(
      {
        product: jsonObject,
        navigation: Type.Array(jsonObject),
        entities: Type.Array(jsonObject),
        features: Type.Object({ limitations: Type.Array(Type.String({ minLength: 1 })) }),
        persistence: Type.Object({ namespace: Type.String({ pattern: "^[a-z0-9-]+$" }) }),
        dashboard: Type.Optional(jsonObject),
        landing: Type.Optional(jsonObject),
        prototype: Type.Optional(jsonObject),
      },
      { additionalProperties: false },
    ),
  },
  { additionalProperties: false },
);

export type CandidateSubmission = Static<typeof candidateToolParameters>;

interface SeedParameters {
  route: unknown;
  theme: unknown;
  features: Record<string, unknown>;
  persistence: Record<string, unknown>;
  components?: unknown;
}

export function expandKnownValues(
  candidate: CandidateSubmission,
  seed: SeedParameters,
): Record<string, unknown> {
  return {
    idea_spec: candidate.idea_spec,
    parameters: {
      route: seed.route,
      ...candidate.parameters,
      theme: seed.theme,
      features: { ...seed.features, ...candidate.parameters.features },
      persistence: { ...seed.persistence, ...candidate.parameters.persistence },
      ...(seed.components === undefined ? {} : { components: seed.components }),
    },
  };
}

export function candidateDocument(candidate: unknown): string {
  return `${JSON.stringify(candidate)}\n`;
}

export async function writeCandidateAtomically(appRoot: string, candidate: unknown): Promise<number> {
  const destination = path.join(appRoot, "candidate.json");
  const temporary = path.join(appRoot, `.candidate-${process.pid}-${Date.now()}.tmp`);
  const document = candidateDocument(candidate);

  await withFileMutationQueue(destination, async () => {
    try {
      await writeFile(temporary, document, { encoding: "utf8", flag: "wx" });
      await rename(temporary, destination);
    } finally {
      await rm(temporary, { force: true });
    }
  });

  return Buffer.byteLength(document, "utf8");
}

export default function submitCandidate(pi: ExtensionAPI) {
  pi.registerTool({
    name: SUBMIT_CANDIDATE_TOOL_NAME,
    label: "Submit candidate",
    description:
      "Submit the complete product decision object. The harness serializes it to candidate.json and verifies it; do not encode JSON as text.",
    parameters: candidateToolParameters,
    executionMode: "sequential",
    async execute(_toolCallId, candidate, _signal, _onUpdate, context) {
      const seed = JSON.parse(
        await readFile(path.join(context.cwd, "parameters.json"), "utf8"),
      ) as SeedParameters;
      const bytes = await writeCandidateAtomically(context.cwd, expandKnownValues(candidate, seed));
      return {
        content: [{ type: "text", text: `Submitted ${bytes} bytes for deterministic verification.` }],
        details: { bytes },
      };
    },
  });
}
