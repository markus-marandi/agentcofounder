# Token-efficiency change for review

This branch is based on Markus's `main` at `5173561`. It keeps the existing
application kernel, showcase, routes, components, skills, extensions, fixtures,
and verification harness. It changes the normal challenge orchestration to a
smaller Pi SDK session and deterministic compiler; the original agent assets and
CLI adapter remain in place, but are not called by the compact runtime.

## What changes

1. Pi receives the product idea plus an 814-character compact decision contract.
2. The model has no tools, skills, extensions, prompt templates, themes, or
   repository context. It returns one compact JSON tuple document.
3. Deterministic code validates and expands that decision, then writes
   `parameters.json`, `API.md`, `decision.json`, and `report.partial.json`.
4. Markus's existing application tests, build, HTTP probe, telemetry collector,
   result contract, showcase, and UI kernel remain the acceptance boundary.
5. The normal path makes one model call. One corrective call is allowed only if
   the first decision is invalid.

## Static efficiency evidence

| Payload | Existing path | This branch | Reduction |
|---|---:|---:|---:|
| Repository-authored prompt characters | 13,458 | 814 | 94.0% |
| Example decision response characters | 517 | 232 | 55.1% |

These are deterministic character counts, not provider token measurements.
Native input, output, cache, reasoning, cost, and success-rate comparisons still
require the organizer's pinned provider/model, final public prompt, cache
weighting, and credentialed runs.

## Markus's work preserved

- All original route identifiers remain accepted.
- The showcase/home navigation and `home-screen-sidebar` block remain generated.
- The optional feature surface and both `localStorage` and memory adapters remain
  valid.
- Existing solution prompts, skills, extensions, fixtures, components, and
  organizer documents remain in the repository.
- The original tool-enabled `runPi` adapter and its contract tests remain. It is
  not exposed as a second runtime mode in this branch; compare it from the base
  revision during the paired benchmark.
- The compiler reuses the existing generic collection kernel instead of asking
  the model to rewrite UI, tests, or storage code.

## Verification on this branch

`npm run check` passed on Node 22.19.0:

- root: 74 tests passed, 4 platform-specific tests skipped;
- generated app: 65 tests passed;
- TypeScript, skill lint, parameter schema, HTTP/server probes, and both
  production builds passed;
- no tracked file is deleted, and `app-template/parameters.json` is unchanged.

GitHub reported no configured checks for this branch when the draft PR opened,
so these are local gate results rather than hosted CI evidence.

## Main files to review

- `src/decision-session.ts`: resource isolation, model selection, event capture,
  timeout, and bounded invalid-response repair.
- `src/product-decision.ts`: compact wire format, semantic validation, and
  deterministic artifact compilation.
- `src/run-challenge.ts`: integration with result assembly and independent app
  verification.
- `app-template/src/generated-config.test.tsx`: parameter-driven create, invalid
  submit, persistence, edit, and delete journey.
- `app-template/src/kernel/config.ts`: additive validation of supplied field,
  filter, derived, feature, navigation, and persistence references.
- `src/compare-runs.ts`: matched-population, same-model comparison that ranks
  verified success before total tokens per verified success.
- `docs/token-benchmark.md`: frozen paired-run procedure and manifest format.

## Reviewer checks

1. Confirm `runDecisionSession` is the only path called by `main`, while the
   original `runPi` adapter remains intact for review.
2. Confirm raw `message_end` events still reconcile to `result.json`.
3. Run `npm run check` on Node 22.19.x.
4. Run the public and ambiguity fixtures with the pinned provider/model.
5. Compare verified-success rate before comparing token or cost totals.
6. Reject the change if the compact tuple format reduces hidden-idea quality
   enough to offset its token savings.

## Known unverified boundary

The repository currently has no configured challenge provider/model variables or
credential secret. Therefore the branch has static and hermetic evidence, but no
native token or cost benchmark. Do not describe it as the winning configuration
until the credentialed paired run is complete.
