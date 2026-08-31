# Token-efficiency evidence

This note separates measured evidence from expected savings so prompt changes
remain easy to review.

## Pre-authentication probe

The local probe used `docs/fixtures/skeleton.txt` with a 30-second runner
budget. Pi exited before a model call because no model was authenticated:

- status: `failed`
- model calls: `0`
- all native token categories: `0`
- Pi exit code: `1`
- error: `No API key found for the selected model.`

Zero tokens was not an efficiency result. GitHub Actions variables, repository
secrets, PR reviews, comments, and draft status were not prerequisites for the
later local credentialed run.

A second `skeleton.txt` probe exercised the restricted `read,edit,write` tool
allowlist through the real challenge command. Pi accepted the launch arguments
and stopped only at the same missing-authentication boundary, again with zero
model calls and an audited event/session record.

## Deterministic handoff

Before this change, the repository-authored initial prompt was 10,718
characters. It then instructed the model to read the already-appended 6,484
character `AGENTS.md` again and load 10,603 characters across two skill bodies.
That exposed about 27,805 repository-authored characters over the run before
ordinary file inspection.

After this change:

- the self-contained initial prompt is 6,986 characters;
- the runner injects no skill metadata or mandatory skill-body reads;
- the prompt explicitly prevents the duplicate `AGENTS.md` read;
- Pi exposes only `read`, `edit`, and `write`; removing Bash drops 511
  serialized tool-definition characters plus its system guidance and prevents
  command output from entering the model context;
- the normal path edits the complete 4,411-character seed configuration instead
  of reading the 13,059-character JSON Schema; the verifier remains the
  authoritative validator and directs an exceptional schema read when needed;
- `idea_spec.json` contains only the two report inputs that are not already in
  `parameters.json` (`target_user` and `assumptions`) instead of duplicating the
  route, entity, fields, journeys, filters, derived values, scope, and
  persistence;
- the verifier derives the product-specific `API.md` entity section from
  `parameters.json`, removing another model file read and documentation edit;
- the settled model response is only `done`; the deterministic report carries
  the authoritative product and verification summary;
- the model does not run journeys, tests, build, or report commands;
- the existing settle-time verifier still regenerates journeys, tests, builds,
  reports, and returns condensed failures for repair.

That is 3,732 fewer initial-prompt characters (34.8%) and 20,819 fewer
repository-authored characters in the intended context trajectory (74.9%).
These are character counts, not native provider tokens. The credentialed A/B
below measures the resulting provider categories directly.

## Credentialed A/B

On 2026-08-31, the same `docs/fixtures/skeleton.txt` input ran from clean output
directories against PR #12 at `04b6f27e` and PR #13 at `9f2d84d2`. Both runs
used Node 22.19.0, `openai-codex/gpt-5.6-sol`, thinking off, the same installed
dependencies, and the runner-owned deterministic quality gates.

| Measure | PR #12 baseline | PR #13 candidate | Observed change |
|---|---:|---:|---:|
| Final status | success | success | quality floor preserved |
| Model calls | 13 | 4 | -69.2% |
| Input tokens | 26,590 | 10,604 | -60.1% |
| Output tokens | 3,362 | 2,024 | -39.8% |
| Cache-read tokens | 172,032 | 10,752 | -93.8% |
| Reported total tokens | 201,984 | 23,380 | -88.4% |
| Reasoning tokens | 372 | 402 | +8.1% |
| Pi telemetry cost estimate | $0.319826 | $0.119116 | -62.8% |
| Generated-app tests | 104/104 passed | 106/106 passed | two additional passing tests |
| Product journeys in the report | 16 passed | 17 passed | one additional verified journey |
| Build and HTTP startup | passed | passed | preserved |

The reported total is the runner's sum of input, output, cache-read, and
cache-write categories. The cost value is Pi telemetry, not evidence of a
separate charge against the ChatGPT subscription.

The execution traces explain the reduction. The baseline used 13 calls, seven
reads, five Bash executions, two writes, and two edits. The candidate used four
calls, two reads, two writes, and no Bash. The candidate also added an
`On loan only` filter and its verified journey, so the lower-token run did not
buy efficiency by dropping Markus's surface or the fixture's behavior.

This is one paired fixture observation, not a universal or statistically stable
claim. Repeat the same controlled comparison with:

1. `docs/fixtures/web-app.txt`
2. ambiguity fixtures 01, 04, and 11

If those interpretations are stable, run all ambiguity fixtures. Keep each
runner-owned `result.json`, artifact directory, and generated app; do not infer
token usage from prompt character counts.

The measured candidate emitted one post-verification warning because a
session-bound cosmetic success-status update ran after Pi had replaced the
settled session. The final result remained `success`, all 106 tests passed, and
build/startup passed. The candidate now omits that invisible JSON-mode status
update, so it cannot be mislabeled as a repair-delivery failure. A live failing
run is still required before claiming the repair path itself is verified.
