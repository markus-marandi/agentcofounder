# ICM + Markus main integration evidence

## Review first

This branch keeps Markus's current product framework and changes the model-owned
configuration path. It does **not** remove or replace the prebuilt application
shell, navigation, lending workflow, Tailwind UI, repository/storage boundary,
generated `API.md`/`openapi.json`, or the real `/api-docs` screen.

- Integration branch: `codex/icm-markus-integration`
- Current Markus main integrated through: `9e40ab9`
- Merge commit: `9f4f8d105c688839150a760d25fb3640625b9069`
- Preserved ICM snapshot: `8fb321a`
- PR #13 source commit remains unchanged:
  `981def68a5c4cafb7ddea445d29b46c1de3f908e`

The branch uses the proven single-stage ICM handoff: Pi receives a compiled
stage plus a minified valid seed, has only the `write` tool, and owns one
`candidate.json`. Deterministic code materializes the candidate, generates the
product tests and API artifacts, and independently qualifies the result.

## Changes beyond Markus main

| Change | Reason from live evidence |
| --- | --- |
| Validate and implement `beforeToday` as a first-class condition | The web fixture needs an overdue filter. Allowing an invented mode produced a plausible configuration with incorrect runtime behavior. Unsupported modes now fail closed. |
| Generate journeys through row actions for action-owned fields | Directly seeding borrower/due-date state bypassed the product workflow and produced invalid tests. |
| Plan action prerequisites deterministically | A due-date action can be gated by a prior lend action. Generated journeys now execute the prerequisite rather than clicking an unavailable action. |
| Treat required booleans as complete false/true values | A required action-owned boolean was incorrectly exposed in the create form and generated an impossible missing-field test. |
| Resolve filter controls by label and field | A filter label can collide with another accessible label; tests now target the intended control. |
| Verify on the `candidate.json` write result | The earlier settle-time follow-up could target a replaced Pi session. Repair guidance now stays inside the valid compiled stage and is limited to three candidate writes. |
| Reuse the verifier's Vitest JSON in report generation | Running the entire suite again added no qualification evidence and caused a correct candidate to time out during reporting. |

The candidate still makes the domain decisions. The fixes above are generic
kernel, validation, or verifier behavior; none contains fixture-specific product
vocabulary.

## Qualified live-run matrix

All runs used Node 22.19.0 and `openai-codex/gpt-5.6-sol` with thinking off.
Every accepted row has valid root and app `result.json` files, 39 passing test
suites, zero failed/skipped/todo tests, a production build, a successful startup
probe, complete telemetry/session/log artifacts, and clean port-3000 ownership
after verification.

`Weighted` below is the provisional planning formula
`input + output*3 + cache_read*0.1`. It is not described as an official score:
the organizer checklist still leaves cache-write weighting and the authoritative
cost formula unresolved.

| Fixture | Calls | Input | Output | Total | Weighted | Pi cost | Journeys | Tests |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| skeleton | 2 | 4,703 | 1,665 | 6,368 | 9,698 | 0.073465 | 18 | 135 |
| web-app | 2 | 5,194 | 2,038 | 7,232 | 11,308 | 0.087110 | 20 | 140 |
| ambiguity 01 — books | 2 | 4,212 | 1,066 | 5,278 | 7,410 | 0.053040 | 18 | 138 |
| ambiguity 02 — vinyl | 2 | 4,505 | 1,339 | 5,844 | 8,522 | 0.062695 | 18 | 138 |
| ambiguity 03 — video games | 2 | 4,260 | 1,114 | 5,374 | 7,602 | 0.054720 | 19 | 139 |
| ambiguity 04 — camping gear | 2 | 4,263 | 1,117 | 5,380 | 7,614 | 0.054825 | 19 | 139 |
| ambiguity 05 — musical instruments | 2 | 4,324 | 1,166 | 5,490 | 7,822 | 0.056600 | 19 | 139 |
| ambiguity 06 — craft supplies | 2 | 4,407 | 1,261 | 5,668 | 8,190 | 0.059865 | 17 | 137 |
| ambiguity 07 — sports equipment | 2 | 4,191 | 1,053 | 5,244 | 7,350 | 0.052545 | 18 | 138 |
| ambiguity 08 — DVDs | 2 | 4,326 | 1,196 | 5,522 | 7,914 | 0.057510 | 18 | 138 |
| ambiguity 09 — comic books | 2 | 4,164 | 1,022 | 5,186 | 7,230 | 0.051480 | 18 | 138 |
| ambiguity 10 — LEGO | 2 | 4,310 | 1,150 | 5,460 | 7,760 | 0.056050 | 18 | 138 |
| ambiguity 11 — theater props | 3 | 6,385 | 2,726 | 11,671 | 14,819 | 0.114985 | 19 | 139 |

Summary: 13/13 qualified; median 5,490 reported total tokens and 7,822
provisional weighted tokens. Twelve runs passed their first candidate in two
model calls. Theater props used one bounded repair and qualified in three.

### Qualified comparisons

| Variant | Total | Provisional weighted | Calls | Tests | Journeys |
| --- | ---: | ---: | ---: | ---: | ---: |
| PR #13 skeleton baseline | 23,380 | 17,751.2 | 4 | 106 | 17 |
| Integrated skeleton | 6,368 | 9,698 | 2 | 135 | 18 |
| Integrated web-app | 7,232 | 11,308 | 2 | 140 | 20 |
| Integrated 13-run median | 5,490 | 7,822 | 2 | 138 | 18 |

Against the PR #13 skeleton baseline, the integrated skeleton used 72.8% fewer
reported total tokens and 45.4% fewer provisional weighted tokens, while
qualifying with more generated tests and journeys. The 13-run median used 76.5%
fewer total and 55.9% fewer provisional weighted tokens.

The earlier ICM-only skeleton trial used 5,504 total / 7,958 provisional
weighted tokens with 106 tests and 17 journeys. Integrating Markus main costs
more on that one fixture (6,368 / 9,698), but it retains the newer product/API
surface and qualifies 135 tests and 18 journeys. This is a measured quality and
coverage trade, not an assertion that the smallest token number is automatically
best.

## What failed before the qualified matrix

Five broader-fixture attempts were deliberately excluded. They exposed, in
order, an accessible-label collision, direct creation of action-owned dates,
missing multi-action prerequisites, required-boolean ownership, and an invented
overdue mode. One later candidate passed 140 tests/build/startup but its report
timed out because the suite was run redundantly; the report fast path fixed that
before the accepted run. These failures are why qualification precedes any
efficiency comparison.

## Judging readiness

| Area | Current evidence | Remaining limit |
| --- | --- | --- |
| Qualification | 13/13 live fixtures produced schema-valid results and independently passed tests, build, startup, and cleanup. | The organizer's hidden prompt has not run. |
| Usability and UX | Markus's responsive shell/navigation/theme stays intact. Generated accessible journeys exercise CRUD, confirmation, filters, actions, empty/error states, and narrow/wide CSS. | No organizer or independent human visual score has been performed. |
| Data and persistence | `Repository`/`StorageAdapter`/`localStorage` remains the only app data boundary; refresh and corrupt-data recovery are tested. | The submitted adapter is local and offline, not a live backend. |
| Robustness | Configuration and modes fail closed; generated tests cover validation, state transitions, deletion, filtering, derived values, API contracts, and startup. | One of 13 fixtures needed a model repair; unfamiliar prompt shapes remain risk. |
| API and integration | Each product generates `API.md` and `openapi.json`; the linked `/api-docs` route renders the product-specific API document. | The boundary is backend-capable but no external service is available in offline judging. |
| Maintainability | Product decisions remain data; materialization, journeys, docs, tests, and runtime are deterministic and separately testable. Root `npm run check` passes. | Rollup retains its non-fatal chunk-size advisory. |
| Efficiency | Native telemetry is preserved per run; only qualified runs are compared. | Official formula/cache-write treatment is still an organizer decision. |

## One-line run and product commands

Run a complete prompt-to-product challenge:

```bash
npm run challenge -- --idea-file docs/fixtures/skeleton.txt --output-dir output/review-skeleton
```

Validate and score the recorded result:

```bash
npm run validate:result -- output/review-skeleton/result.json
npm run score
```

The generated-app `result.json` records `npm run dev` as `start_command`,
evaluated from that result's directory. The equivalent root-result command is:

```bash
npm --prefix "output/review-skeleton" run dev
```

That one line serves both the application at `/` and the linked product API
documentation at `/api-docs`.

## Windows behavior

The Windows work was portability and process-accounting work, not a change to
the generated product:

- Node cannot execute npm/Vitest `.cmd` shims with the same `shell: false`
  process semantics as POSIX. The verifier therefore launches Node 22.19.0
  directly with Vitest's `vitest.mjs` or npm's `npm-cli.js` entrypoint.
- Startup verification resolves the exact listener owner, checks IPv4 and IPv6,
  and kills only the process tree it started. A listener that existed before the
  run is evidence of a contaminated run and is never silently killed.
- A manually interrupted npm/Vite launcher can leave its child alive on Windows.
  The automated product verifier proved clean ownership and cleanup; manual
  diagnostics also checked the exact PID and confirmed port 3000 was free.
- Node 22.19.0 is pinned because the challenge lockfiles and jsdom gate target it.
  The earlier Node 25/jsdom failure was an environment mismatch, not app failure.

## Reproduction and artifact scope

Run the fixture command once per file under `docs/fixtures/`. The generated
`output/`, root `result.json`, and `artifacts/runs/<timestamp>/` directories are
runner-owned and ignored rather than committed. They contain the raw evidence;
this committed page is the reviewer index. Because model calls are stochastic,
exact token counts may vary, but every rerun must meet the same qualification
gates before it is compared.
