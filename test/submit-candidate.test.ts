import { Ajv } from "ajv";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  candidateDocument,
  type CandidateSubmission,
  candidateToolParameters,
  expandKnownValues,
  writeCandidateAtomically,
} from "../solution/extensions/submit-candidate.js";

const candidate: CandidateSubmission = {
  idea_spec: {
    target_user: "A collector",
    assumptions: ["One browser-local user."],
  },
  parameters: {
    product: { name: "Shelf", tagline: "Know what you own." },
    navigation: [],
    entities: [],
    features: { limitations: ["Browser-local only."] },
    persistence: { namespace: "shelf" },
    dashboard: { summary: true },
    landing: { hero: true },
    prototype: { flow: true },
  },
};

const seed = {
  route: "web-app",
  theme: { preset: "tech-innovation" },
  features: { search: true, auth: false },
  persistence: { adapter: "localStorage", namespace: "idea-tracker" },
  components: { collection: true },
};

describe("structured candidate submission", () => {
  it("requires the candidate wrapper and every root configuration section", () => {
    const validate = new Ajv({ strict: false }).compile(candidateToolParameters);

    expect(validate(candidate)).toBe(true);
    expect(
      validate({
        ...candidate,
        parameters: {
          ...candidate.parameters,
          persistence: undefined,
          features: {
            ...candidate.parameters.features,
            persistence: candidate.parameters.persistence,
          },
        },
      }),
    ).toBe(false);
  });

  it("serializes the structured arguments instead of accepting JSON text", () => {
    expect(candidateDocument(candidate)).toBe(`${JSON.stringify(candidate)}\n`);
  });

  it("restores harness-owned values without asking the model to repeat them", () => {
    expect(expandKnownValues(candidate, seed)).toEqual({
      idea_spec: candidate.idea_spec,
      parameters: {
        route: "web-app",
        product: candidate.parameters.product,
        theme: seed.theme,
        navigation: [],
        entities: [],
        features: { search: true, auth: false, limitations: ["Browser-local only."] },
        persistence: { adapter: "localStorage", namespace: "shelf" },
        components: seed.components,
        dashboard: candidate.parameters.dashboard,
        landing: candidate.parameters.landing,
        prototype: candidate.parameters.prototype,
      },
    });
  });

  it("publishes candidate.json atomically and leaves no temporary file", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "agent-cofounder-submit-"));
    try {
      await writeCandidateAtomically(root, candidate);

      const replacement = {
        ...candidate,
        idea_spec: { ...candidate.idea_spec, assumptions: ["Replacement submission."] },
      };
      await writeCandidateAtomically(root, replacement);

      expect(JSON.parse(await readFile(path.join(root, "candidate.json"), "utf8"))).toEqual(replacement);
      expect(await readdir(root)).toEqual(["candidate.json"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
