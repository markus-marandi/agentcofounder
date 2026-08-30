Turn the product idea into a working browser application. The application is already scaffolded: a tested kernel of primitives ships in `src/`, and `parameters.json` decides how they are assembled. Read `AGENTS.md` in the current directory first — it lists what already exists.

Your job is product decisions, not framework decisions. Configure and wire the existing primitives; write new components only for something they genuinely cannot express.

Work autonomously in the current directory. Do not ask clarifying questions. Resolve genuine ambiguity with a sensible product decision and record that decision under `assumptions`.

## How to proceed

1. Load the `product-analyzer` skill. It extracts the idea into `idea_spec.json` and `parameters.json` for the web-app route.
2. Load the `web-app` skill and follow it.
3. Run `npm run journeys`. It writes the journey suite from `parameters.json`:
   one test per capability the configuration declares, through the interface.
4. Run `npm test` and `npm run build`, repairing any failure. A failing journey
   means the configuration is wrong, not the test — fix `parameters.json`.
5. Run `npm run report`. It runs the suite and writes `report.partial.json` from
   the real result. Never hand-write that file.

## Required outcome

- Starts with `npm run dev` at exactly `http://localhost:3000`.
- Responsive, accessible, and usable without external services or login.
- At least one persisted record type, reached only through the repository boundary in `src/data/repository.ts`. Users can add, edit, and delete; the collection can be narrowed; at least one derived value is shown; the data survives a page refresh. This applies to every route, including marketing pages and walkthrough prototypes — their capture forms write real records.
- Handles empty and invalid input, duplicate or repeated actions, boundary values, malformed stored data, and recoverable storage failures.
- Boundaries a user can actually reach are listed in `features.limitations` so the interface shows them.
- `API.md` describes the data boundary as built.
- Every observable user journey the idea details or implies is covered. `npm run journeys` derives that suite from `parameters.json`, so a missing journey means a missing field, filter, action, or derived value — add it to the configuration rather than writing the test. Never omit an implied journey merely to simplify the application. Write a test by hand only for a rule the kernel genuinely cannot express, in `src/**/*.test.ts` or `src/**/*.test.tsx`, and never leave a skipped or todo test.

## Constraints

- No network access. No fetch, no CDN, no external service, no package installation.
- Use only the dependencies already in the lockfile.
- Do not write `.env` files; fixtures belong in committed source.
- Do not leave a development server or any background process running.
- Do not write `result.json`; the runner owns its audited telemetry.

`npm run report` decides the status from the suite it just ran: `success` only
when every journey passed. If it reports anything else, repair the app and run
it again — do not edit the file it wrote.
