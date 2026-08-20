# Generated application contract

This app is already built. A kernel of tested primitives ships in `src/`, and
`parameters.json` decides how they are assembled. **Prefer configuring and
wiring what exists over writing a new component**: less code means fewer ways to
fail, and the primitives are already covered by tests.

## How assembly works

1. Write `parameters.json` (validated against `parameters.schema.json`).
2. `src/kernel/config.ts` loads it and fails loudly if it is invalid.
3. `src/App.tsx` renders a view per `navigation` entry.
4. Chrome follows the menu count: one entry means no navigation, two to four a
   bar, five or more a sidebar. Do not hand-pick a layout.

## Delivery floor — every route, no exceptions

1. At least one persisted entity, reached only through the repository boundary.
2. Create, edit, and delete.
3. At least one filter and at least one derived value.
4. Data survives a page refresh.
5. At least one passing test; never `.skip` or `.todo`.
6. Works on a narrow screen and a wide one.
7. Limitations listed in `features.limitations`, which the interface shows.
8. `API.md` describes the data boundary.
9. Runs at `http://localhost:3000` and leaves no process behind.

A landing page and a walkthrough prototype meet this floor too: their capture
forms write real records. A form that discards what it collects is a mock.

## What is already available

| Need | Use |
|---|---|
| Read or write records | `src/data/repository.ts` via `src/kernel/useRepository.ts` |
| Browser persistence | `src/data/localStorageAdapter.ts` (recovers from corrupt data) |
| Validation, filters, derived values | `src/data/operations.ts` |
| Local search | `src/data/searchIndex.ts` |
| Full CRUD screen | `src/ui/CollectionView.tsx` |
| Form controls | `src/ui/Field.tsx`, `src/ui/RecordForm.tsx` |
| Charts (SVG, no dependency) | `src/ui/Chart.tsx`, `src/ui/DashboardGrid.tsx` |
| Seeded sample data | `src/mock/generators.ts` |
| Demonstration roles | `src/auth/mockAuth.ts`, `src/auth/seed-users.ts` |
| Marketing page | `src/ui/LandingPage.tsx` |
| Clickable walkthrough | `src/ui/PrototypeFlow.tsx` |
| Failure containment | `src/ui/ErrorBoundary.tsx` |
| Offline comparison material | `src/content/positioning.json` |
| Styling | semantic classes in `src/styles.css`; themes in `src/themes/presets.css` |

Style with the existing semantic classes (`.card`, `.stack`, `.row`, `.field`,
`.button`, `.notice`, `.empty`, `.stat`). Add CSS only for something genuinely
new, and use the theme custom properties rather than literal colours.

## Rules

- **No network.** No fetch, no CDN, no external service. This machine is offline.
- **No new dependencies** and no install commands. Use what the lockfile has.
- **Do not write `.env` files.** Fixtures belong in committed source.
- **Do not create or edit `result.json`.** The runner owns it.
- Keep tests in `src/**/*.test.ts` or `src/**/*.test.tsx`.
- Test observable behaviour through the interface, not implementation details.

## Reporting

`report.partial.json` contains only `status`, `app_url`, `start_command`,
`summary`, `implemented_features`, `assumptions`, and `tests_run`.

A `success` report needs at least one `tests_run` entry and every entry must be
`passed`. If a journey failed or was not run, record it as `failed`, say why in
`journey`, and use `partial` — or `failed` when the app cannot run.

The runner owns the final `app_url`, the location-aware `start_command`,
`harness_checks`, and all telemetry.
