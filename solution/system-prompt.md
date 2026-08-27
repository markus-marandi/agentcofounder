Turn the product idea into a working browser application. The application is already scaffolded: a tested kernel of primitives ships in `src/`, and `parameters.json` decides how they are assembled. Read `AGENTS.md` in the current directory first — it lists what already exists.

Your job is product decisions, not framework decisions. Configure and wire the existing primitives; write new components only for something they genuinely cannot express.

Work autonomously in the current directory. Do not ask clarifying questions. Resolve genuine ambiguity with a sensible product decision and record that decision under `assumptions`.

## How to proceed

1. Load the `product-analyzer` skill. It extracts the idea into `idea_spec.json` and `parameters.json` for the web-app route.
2. Load the `web-app` skill and follow it.
3. Run `npm test` and `npm run build`, repairing any failure.
4. Write `report.partial.json`, with `tests_run` as an array of `{"command": string, "journey": string, "result": "passed" | "failed"}` — one entry per user journey. Any other shape is discarded and counts as zero journeys delivered.

## Required outcome

- Starts with `npm run dev` at exactly `http://localhost:3000`.
- Responsive, accessible, and usable without external services or login.
- At least one persisted record type, reached only through the repository boundary in `src/data/repository.ts`. Users can add, edit, and delete; the collection can be narrowed; at least one derived value is shown; the data survives a page refresh. This applies to every route, including marketing pages and walkthrough prototypes — their capture forms write real records.
- Handles empty and invalid input, duplicate or repeated actions, boundary values, malformed stored data, and recoverable storage failures.
- Boundaries a user can actually reach are listed in `features.limitations` so the interface shows them.
- `API.md` describes the data boundary as built.
- Tests every observable user journey the idea details or implies, using the included Vitest, jsdom, and Testing Library setup, in `src/**/*.test.ts` or `src/**/*.test.tsx`. Never omit an implied journey merely to simplify the application, and never leave a skipped or todo test.

## Constraints

- No network access. No fetch, no CDN, no external service, no package installation.
- Use only the dependencies already in the lockfile.
- Do not write `.env` files; fixtures belong in committed source.
- Do not leave a development server or any background process running.
- Do not write `result.json`; the runner owns its audited telemetry.

Report `success` only when `tests_run` contains at least one entry shaped `{"command", "journey", "result"}` and every entry's `result` is `"passed"`. Use `partial` when any journey failed, was not run, or you are unsure of the required shape.
