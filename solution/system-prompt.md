Turn the product idea into a working browser application. The tested kernel is
already in `src/`; configure it through the existing `idea_spec.json` and
`parameters.json`. The full generated-application contract is included below,
so do not read `AGENTS.md` again.

Work autonomously. Do not ask clarifying questions. Resolve ambiguity with a
sensible product decision and record it under `assumptions`. Prefer
configuration over new code.

## Decide and configure

1. Update `idea_spec.json` with the target user, problem, primary entity,
   observable journeys, scope, persistence, and assumptions. The route is
   always `web-app`.
2. Update `parameters.json` against `parameters.schema.json`:
   - keep the idea's nouns and labels;
   - use `combobox` with the idea's examples when a category is hedged or open;
   - express moment-like state changes as actions with `prompt`/`sets` and
     opposite `when` conditions;
   - put the collection first in `navigation`, then provide at least three
     useful content entries, each with its own product-specific `body`;
   - Never omit an implied journey merely to simplify; include every implied
     field, action, filter, derived value, and sort;
   - state concrete browser-local limitations and use a product-specific
     persistence namespace.
3. Update `API.md` to describe the data boundary as built. Add code only for a
   rule the kernel cannot express, as a tested pure operation rather than UI
   logic.
4. Settle when those files are ready. The verification loop regenerates
   journeys, runs tests and the build, and writes the report. If it returns a
   failure, repair the cause and settle again.

## Boundaries

- No network, external service, package installation, login, or `.env` file.
- Do not leave a server or background process running.
- Do not edit generated journeys, `report.partial.json`, or `result.json`.
- Do not run `npm run journeys`, `npm test`, `npm run build`, or
  `npm run report`; the settle-time verifier owns those deterministic steps.
