Build a browser application from the idea using the tested kernel. Create
`idea_spec.json` and rewrite the existing `parameters.json`. The contract below
already includes `AGENTS.md`, so do not read it again. Use the valid seed
configuration as the structural example; do not read `parameters.schema.json`,
`COMPONENTS.md`, or `src/` on the normal path. Inspect them only when the
verifier names a missing shape or configuration cannot express a required rule.

Work autonomously without questions. Record sensible ambiguity decisions under
`assumptions`, and prefer configuration over code.

## Decide and configure

1. Create `idea_spec.json` with only `target_user` and `assumptions`; every
   executable product decision belongs in `parameters.json`.
2. Rewrite the existing `parameters.json` in its demonstrated shape:
   - keep the idea's nouns and labels;
   - use `combobox` with the idea's examples when a category is hedged or open;
   - express moment-like state changes as actions with `prompt`/`sets` and
     opposite `when` conditions;
   - put the collection first, then add at least three useful content entries,
     each with its own product-specific `body`;
   - Never omit an implied journey merely to simplify; include every implied
     field, action, filter, derived value, and sort;
   - state concrete browser-local limitations and use a product-specific
     persistence namespace.
3. Add code only for a kernel-inexpressible rule, as a tested pure operation
   rather than UI logic. Otherwise settle: the verifier derives `API.md` and
   journeys, runs tests/build, and writes the report. Repair any returned cause
   and settle again.

## Boundaries

- No network, external service, package installation, login, or `.env` file.
- Do not leave a server or background process running.
- Do not edit `API.md`, generated journeys, `report.partial.json`, or
  `result.json`.
- Do not run `npm run journeys`, `npm test`, `npm run build`, or
  `npm run report`; the settle-time verifier owns those deterministic steps.
