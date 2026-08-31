# Compiled single-stage ICM experiment

Status: experimental branch based on PR #13 commit
`981def68a5c4cafb7ddea445d29b46c1de3f908e`. PR #13 is unchanged.

This page preserves the original PR #13 experiment record. The later branch
that integrates Markus main and qualifies skeleton, web-app, and all 11
ambiguity fixtures is documented in
[`icm-markus-integration-evidence.md`](icm-markus-integration-evidence.md).

## Question

Can the configurable product route preserve PR #13's generated-product quality
while removing model-directed repository discovery and schema reads?

The tested factor is a compiled, single model-owned configure stage:

1. deterministically combine the stage contract and minified valid seed;
2. give the model only the `write` tool;
3. require one `candidate.json` containing `idea_spec` and `parameters`;
4. materialize those kernel inputs deterministically;
5. retain the existing generated journeys, Vitest, build, startup, and report
   gates.

No Markus-authored shell, navigation, search, theme, CRUD, or showcase surface
is removed. The experiment changes how configuration is produced, not the
shipped product framework.

## Frozen comparison

- Fixture: `docs/fixtures/skeleton.txt`
- Runtime: Node 22.19.0
- Provider/model: `openai-codex/gpt-5.6-sol`
- Thinking: off
- PR #13 comparison result: successful 106/106 tests and 17/17 journeys
- Telemetry source: Pi JSON event stream

## Results

| Variant | Verdict | Calls | Input | Output | Cache read | Total | Reasoning | Pi cost | Tests | Journeys |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| PR #13 | success | 4 | 10,604 | 2,024 | 10,752 | 23,380 | 402 | 0.119116 | 106/106 | 17/17 |
| ICM trial 1 | success, quality gap | 2 | 4,006 | 1,142 | 0 | 5,148 | 272 | 0.054290 | 105/105 | 16/16 |
| ICM trial 2 | excluded false positive | 2 | 4,811 | 1,799 | 0 | 6,610 | 297 | 0.078025 | seed app passed | seed app passed |
| ICM trial 3 | genuine success | 2 | 4,277 | 1,227 | 0 | 5,504 | 367 | 0.058195 | 106/106 | 17/17 |

The final trial reduced reported total tokens by 76.5% and model calls by 50%
relative to PR #13. Pi cost telemetry fell by 51.1%. It matched PR #13's test
and journey counts and preserved the borrower-at-lend action and required game
type behavior.

Trial 1 showed why the quality gate matters: it was cheaper, but made game type
optional and required a separate edit before lending. The compact contract was
refined with generic required-value and action-prompt rules.

Trial 2 produced the correct product configuration but encoded
`idea_spec.assumptions` as a string instead of an array. Materialization failed,
then the old verifier continued against the untouched seed app and reported a
false success. The experiment therefore added two protections before trial 3:

- the output contract now states the exact assumptions array shape;
- the outer runner independently materializes the candidate and refuses to
  verify or accept the seed app when materialization fails.

## What changed for review

- `src/icm-context.ts`: compiles and hashes the bounded context packet.
- `solution/icm-configure-stage.md`: defines the single model-owned decision
  stage and exact output contract.
- `app-template/tools/materialize-candidate.mjs`: splits the one model output
  into the two existing kernel inputs with fail-closed structural checks.
- `solution/extensions/protected-paths.ts`: limits model writes to
  `candidate.json`.
- `solution/extensions/verify-loop.ts`: materializes before generated journeys
  and refuses to produce a success report after materialization failure.
- `src/run-challenge.ts`: launches Pi with only `write`, stores the compiled
  packet manifest, and independently enforces materialization before final app
  verification.
- focused tests cover context compilation, write-only launch arguments,
  materialization, malformed assumptions, prompt budget, and the outer
  fail-closed verdict.

The final compiled packet was 5,233 characters and records SHA-256 identities
for its stage, seed, and compiled output in `context-manifest.json`.

## Verification and limits

- Focused ICM/runner gate: 27/27 passed.
- TypeScript: passed.
- Final generated app: 106/106 tests, 17/17 journeys, production build, and
  production startup passed.
- Repository-wide gate: 70 passed, 4 skipped, and 4 existing Windows
  `verify-app` cases hit their 45-second timeout; the failures were followed by
  locked temporary-directory cleanup errors.

This is one fixture and one live sample per iteration. It supports a promising
bounded result, not a universal ICM efficiency claim. Repeat across the other
fixtures and models before making it the default.

## Audit artifacts

- Trial 1: `artifacts/runs/2026-08-31T08-01-40-005Z`
- Trial 2: `artifacts/runs/2026-08-31T08-14-10-132Z`
- Trial 3: `artifacts/runs/2026-08-31T08-24-58-367Z`
