# Token-efficiency evidence

This note separates measured evidence from expected savings so prompt changes
remain easy to review.

## Fixture baseline

The local probe used `docs/fixtures/skeleton.txt` with a 30-second runner
budget. Pi exited before a model call because no model was authenticated:

- status: `failed`
- model calls: `0`
- all native token categories: `0`
- Pi exit code: `1`
- error: `No API key found for the selected model.`

Zero tokens is not an efficiency result. A credentialed run is still required
for native input, output, cache-read, cache-write, cost, and quality evidence.
GitHub Actions variables, repository secrets, PR reviews, comments, and draft
status are not prerequisites for a local run.

## Deterministic handoff

Before this change, the repository-authored initial prompt was 10,718
characters. It then instructed the model to read the already-appended 6,484
character `AGENTS.md` again and load 10,603 characters across two skill bodies.
That exposed about 27,805 repository-authored characters over the run before
ordinary file inspection.

After this change:

- the self-contained initial prompt is 8,987 characters;
- the runner injects no skill metadata or mandatory skill-body reads;
- the prompt explicitly prevents the duplicate `AGENTS.md` read;
- the model does not run journeys, tests, build, or report commands;
- the existing settle-time verifier still regenerates journeys, tests, builds,
  reports, and returns condensed failures for repair.

That is 1,731 fewer initial-prompt characters (16.1%) and 18,818 fewer
repository-authored characters in the intended context trajectory (67.7%).
These are character counts, not native provider tokens. The native-token claim
must wait for an authenticated A/B run.

## Credentialed A/B

Run the same fixture, provider, model, thinking setting, timeout, and clean
output state against the base and candidate commits. Compare verified success
first, then native total tokens and cost. Start with:

1. `docs/fixtures/skeleton.txt`
2. `docs/fixtures/web-app.txt`
3. ambiguity fixtures 01, 04, and 11

If those interpretations are stable, run all ambiguity fixtures. Keep each
runner-owned `result.json`, artifact directory, and generated app; do not infer
token usage from prompt character counts.
