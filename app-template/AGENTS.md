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
6. Works on a narrow screen and a wide one.
7. Reachable boundaries appear in `features.limitations`, which the report
   carries.
8. Generated `API.md` describes the configured entities and data boundary;
   generated `openapi.json` describes the wire contract. The app renders both
   at `/api-docs`, linked from the bottom of the sidebar.
9. Runs at `http://localhost:3000` and leaves no process behind.

Landing pages and walkthroughs meet the same floor: their forms persist real
records. A form that discards input is a mock.

## Configuration map

| Need | Existing boundary |
|---|---|
| Read or write records | `src/data/repository.ts` via `src/kernel/useRepository.ts` |
| Browser persistence | `src/data/localStorageAdapter.ts` (recovers from corrupt data) |
| A remote store | `src/data/httpAdapter.ts` — implemented and tested, wired to nothing |
| Proving a new adapter works | `src/data/adapterContract.ts`, run against every adapter |
| Getting data out and back in | `src/data/portability.ts`; the buttons above the collection |
| Validation, filters, derived values, sorting | `src/data/operations.ts` |
| One-click record changes (mark returned, lend to, mark paid) | `entities[].actions` in `parameters.json` |
| A category that is suggested but not closed | a `combobox` field |
| Local search | `src/data/searchIndex.ts` |
| Full CRUD screen | `src/ui/CollectionView.tsx` |
| Form controls | `src/ui/Field.tsx`, `src/ui/RecordForm.tsx` |
| Charts (SVG, no dependency) | `src/ui/Chart.tsx`, `src/ui/DashboardGrid.tsx` |
| Seeded sample data | `src/mock/generators.ts` |
| Demonstration roles | `src/auth/mockAuth.ts`, `src/auth/seed-users.ts` |
| Marketing page | `src/ui/LandingPage.tsx` |
| Clickable walkthrough | `src/ui/PrototypeFlow.tsx` |
| Failure containment | `src/ui/ErrorBoundary.tsx` |
| Brand mark and wordmark | `src/ui/Logo.tsx`; the same art as `public/logo.svg` / `public/favicon.svg` |
| The one search box | `src/ui/AppShell.tsx` owns it, views read it via `src/ui/shellSearch.ts` |
| The journey suite | `npm run journeys`, from `parameters.json` |
| `report.partial.json` | `npm run report`, from the suite it runs |
| The API docs, rendered | `/api-docs` while the app runs; `npm run docs` serves the same page on port 3001 |
| The API entity section | `npm run api` derives `API.md` from `parameters.json` |
| The wire contract | `npm run contract` writes `openapi.json` from `parameters.json`; `/api-docs` renders it with the record schemas and the table mapping |
| Offline comparison material | `src/content/positioning.json` |
| Styling | Tailwind utilities over the theme tokens defined in `src/styles.css`; presets in `src/themes/presets.css` |

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

- **No network.** No fetch, no CDN, no external service. This machine is offline.
- **No new dependencies** and no install commands. Use what the lockfile has.
- **Do not write `.env` files.** Fixtures belong in committed source.
- **Do not create or edit `API.md`, `openapi.json`, `result.json`,
  `report.partial.json`, or `src/journeys.generated.test.tsx`.** The verifier
  and outer runner own them.
- Keep tests in `src/**/*.test.ts` or `src/**/*.test.tsx`.
- Test observable behaviour through the interface, not implementation details.
- **Nothing above `src/data/repository.ts` may touch a store.** The adapter may
  answer asynchronously; the repository absorbs that, so views stay synchronous
  and a database or a service is one more adapter, not a rewrite. A new adapter
  is finished when it passes `src/data/adapterContract.ts`.
- **A field an action owns is not offered when creating a record.** Lending
  sets `borrower` and stamps `lentOn`, so the create form withholds both and
  the action is the only way to reach that state — otherwise a record can be
  out on loan with no date, having never been lent. An edit still shows every
  field, because correcting a record is exactly when you need them.
- A missing journey is a missing field, filter, action, or derived value in
  `parameters.json`; fix the configuration.
- Hand-write a test only for a kernel-inexpressible rule, through observable
  behavior.
- Do not run `npm run api`, `npm run contract`, `npm run journeys`, `npm test`,
  `npm run build`, or `npm run report`. Settle when ready; the verifier owns
  those steps and returns condensed failures for repair.

The verifier owns `report.partial.json`; the outer runner owns final URLs,
commands, harness checks, and telemetry.
