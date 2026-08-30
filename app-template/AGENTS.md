# Generated application contract

This app is already built. `parameters.json` assembles tested primitives in
`src/`. Preserve the shipped UI and configure it before writing code.

## Assembly

1. Edit `parameters.json`; it is validated by `parameters.schema.json` and
   loaded by `src/kernel/config.ts`.
2. `src/App.tsx` renders one real view per `navigation` entry.
3. The responsive rail, sticky header, single search box, day/night mode,
   palette, and row hierarchy are fixed chrome. Navigation configures what the
   rail contains, not whether the shell exists.
4. On settle, the verifier regenerates `API.md` and journeys from
   `parameters.json`, runs tests/build, and derives `report.partial.json`.

## Delivery floor — every route, no exceptions

1. At least one persisted entity, reached only through the repository boundary.
2. Create, edit, and confirmed delete, plus an `action` for any state change the
   idea describes as a moment rather than an edit.
3. At least one meaningful filter and one derived value.
4. Data survives a page refresh.
5. At least one passing test; never `.skip` or `.todo`.
6. Works on narrow and wide screens.
7. Reachable boundaries appear in `features.limitations`.
8. Generated `API.md` describes the configured data boundary.
9. Runs at `http://localhost:3000` and leaves no process behind.

Landing pages and walkthroughs meet the same floor: their forms persist real
records. A form that discards input is a mock.

## Configuration map

| Need | Existing boundary |
|---|---|
| Records and browser persistence | `src/data/repository.ts`, `src/kernel/useRepository.ts`, `src/data/localStorageAdapter.ts` |
| Validation, filters, totals, sorting | `src/data/operations.ts` |
| Moment-like state changes | `entities[].actions` with `prompt`, `sets`, and `when` |
| Open suggested category | `combobox` field |
| Search and responsive chrome | `src/data/searchIndex.ts`, `src/ui/AppShell.tsx` |
| CRUD, forms, row actions, recovery | `src/ui/CollectionView.tsx`, `src/ui/RecordForm.tsx` |
| Dashboard, marketing, walkthrough | `src/ui/DashboardGrid.tsx`, `src/ui/LandingPage.tsx`, `src/ui/PrototypeFlow.tsx` |
| API, journey suite, report | settle-time verifier, derived from configuration and real results |
| Styling | existing components and the tokens in `src/styles.css` |

Write a new pure function in `src/data/operations.ts` only for a rule this map
cannot express, and test it beside the function. Keep domain logic out of UI
components.

## Preserve the shipped surface

- Do not remove, rebuild, or restyle the shell, navigation, search, theme mode,
  brand mark, CRUD surface, or confirmation flows.
- Put the collection first in `navigation`. Every content entry needs its own
  useful, product-specific `body`; never create placeholder destinations.
- Use `product.name` and `product.tagline`; never hard-code another wordmark.
- Use the nearest existing component and theme tokens for genuinely new UI.
  Do not add literal colours, tinted page backgrounds, decorative controls, a
  second search box, or more than one primary row button.

## Rules

- No network, CDN, external service, dependency installation, or `.env` file.
- Do not create or edit `API.md`, `result.json`, `report.partial.json`, or
  `src/journeys.generated.test.tsx`.
- A missing journey is a missing field, filter, action, or derived value in
  `parameters.json`; fix the configuration.
- Hand-write a test only for a kernel-inexpressible rule, in
  `src/**/*.test.ts` or `src/**/*.test.tsx`, through observable behavior.
- Do not run `npm run journeys`, `npm test`, `npm run build`, or
  `npm run report`. Settle when ready; the verifier owns those steps and
  returns condensed failures for repair.

The verifier owns `report.partial.json`; the outer runner owns final URLs,
commands, harness checks, and telemetry.
