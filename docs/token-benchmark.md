# Paired token benchmark

Use this procedure before claiming that the compact runner is more efficient.
The comparison ranks verified success first. A candidate cannot compensate for
fewer successful products by spending fewer tokens.

## Freeze the experiment

Record both commit SHAs, Node and Pi versions, provider/model, thinking level,
timeout, fixture population, repetition count, cache policy, and run order before
starting. Use the same values and credential scope for both candidates. Run each
trial in a fresh output directory and preserve its raw session and event stream.

The minimum development population is every `.txt` file in `docs/fixtures`.
The organizer's final public and hidden ideas remain separate acceptance gates.
For repeated trials, give each trial a unique fixture identifier such as
`ambiguity-01-books#2` in the manifest.

## Produce results

Check out Markus's base commit and this branch in separate clean worktrees. In
each worktree, run the same fixture list. For example:

```bash
npm run challenge -- --idea-file docs/fixtures/ambiguity-01-books.txt --output-dir output/benchmark/ambiguity-01-books
```

Keep each generated `output/benchmark/<fixture>/result.json`. A non-zero command
exit is still a benchmark observation; do not exclude or rerun it selectively.

## Build the manifest

Paths are resolved relative to the manifest file.

```json
{
  "version": 1,
  "runs": [
    {
      "candidate": "markus-main-5173561",
      "fixture": "ambiguity-01-books",
      "result": "../main/output/benchmark/ambiguity-01-books/result.json"
    },
    {
      "candidate": "compact-<commit-sha>",
      "fixture": "ambiguity-01-books",
      "result": "../compact/output/benchmark/ambiguity-01-books/result.json"
    }
  ]
}
```

Every candidate must contain the same unique fixture identifiers. The comparator
also rejects invalid result contracts, missing call evidence, mixed model IDs,
and duplicate candidate/fixture pairs.

## Compare

```bash
npm run benchmark:compare -- --manifest path/to/benchmark-manifest.json
```

The command writes `artifacts/token-comparison.json`. Ranking is lexicographic:

1. more runs with successful status, passing product journeys, passing harness
   checks, a clean Pi exit, audited model use, and no remaining port listener;
2. fewer total tokens across all trials per verified success.

Tokens from failed trials remain in the numerator. This prevents a brittle,
cheap candidate from looking efficient by discarding its failures.

The development comparator does not replace organizer browser tests or semantic
review of idea coverage. Keep the PR in draft if the compact format loses those
quality gates, even when it wins this calculation.
