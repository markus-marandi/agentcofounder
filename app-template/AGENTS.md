# Generated application contract

This app is already built. A kernel of tested primitives ships in `src/`, and
`parameters.json` decides how they are assembled. **Prefer configuring and
wiring what exists over writing a new component**: less code means fewer ways to
fail, and the primitives are already covered by tests.

## How assembly works

1. Write `parameters.json` (validated against `parameters.schema.json`).
2. `src/kernel/config.ts` loads it and fails loudly if it is invalid.
3. `src/App.tsx` renders a view per `navigation` entry.
4. Chrome is the same in every generated app: a sidebar rail (a drawer on
   narrow screens), a sticky header with the one search field, and day/night.
   It is not configurable and does not depend on how many menu entries there
   are — `navigation` decides what is *in* the rail, never whether there is one.
5. `npm run journeys` writes `src/journeys.generated.test.tsx` from the same
   file — one journey per capability the configuration declares.
6. `npm run report` runs that suite and writes `report.partial.json` from what
   it observed.

## Delivery floor — every route, no exceptions

1. At least one persisted entity, reached only through the repository boundary.
2. Create, edit, and delete — plus a one-click `action` for any state change
   the idea describes as a moment ("when it comes back I clear that off")
   rather than as editing a field.
3. At least one filter and at least one derived value.
4. Data survives a page refresh.
5. At least one passing test; never `.skip` or `.todo`.
6. Works on a narrow screen and a wide one.
7. Limitations listed in `features.limitations`, which the report carries.
8. `API.md` describes the data boundary, and the app serves it rendered at
   `/api-docs`, linked from the bottom of the sidebar. Add a section naming the
   entities this app actually built; leave the boundary sections alone, and do
   not restate the wire contract — it is generated and appended.
9. Runs at `http://localhost:3000` and leaves no process behind.

A landing page and a walkthrough prototype meet this floor too: their capture
forms write real records. A form that discards what it collects is a mock.

## What is already available

| Need | Use |
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
| The wire contract | `npm run contract` writes `openapi.json` from `parameters.json`; `/api-docs` renders it with the record schemas and the table mapping |
| Offline comparison material | `src/content/positioning.json` |
| Styling | Tailwind utilities over the theme tokens defined in `src/styles.css`; presets in `src/themes/presets.css` |

Match the styling of the component nearest to what you are building rather
than inventing a look: the kernel components are the reference. Use the theme
tokens (`surface`, `ink`, `ink-soft`, `line`, `accent`, `danger`) rather than
literal colours, so every preset keeps working. Add CSS only for something
genuinely new — and put any element-level rule inside `@layer base`, or it
will silently outrank every Tailwind utility in the app.

The look is fixed and is not a per-product decision:

- **One palette, always.** Neutral gray chrome and an indigo accent, in every
  generated app. `theme.preset` is still validated for compatibility but no
  longer changes a colour — a product that ships lime one run and amber the
  next is a lottery, not a design.
- **No tinted backgrounds.** The page is `surface`, full stop. Panels are
  separated by `line` borders, not by fills. `surface-sunk` is for hover and
  for a sunk row, never for a page.
- **Chrome tells the truth.** Everything in the header and the rail does what
  it looks like it does. Nothing decorative, no placeholder tabs, no second
  search box beside the shell's.
- **One button per row.** The action a row is *for* is a button; edit/remove
  and the rest are text links.
- `product.name` and `product.tagline` in `parameters.json` are the only
  wordmark. Never hard-code a product name in a component.

## Rules

- **No network.** No fetch, no CDN, no external service. This machine is offline.
- **No new dependencies** and no install commands. Use what the lockfile has.
- **Do not write `.env` files.** Fixtures belong in committed source.
- **Do not create or edit `result.json`.** The runner owns it.
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
- **Do not hand-write the journey suite or edit `src/journeys.generated.test.tsx`.**
  Run `npm run journeys`. A missing journey is a missing field, filter, action,
  or derived value in `parameters.json` — fix it there and regenerate.

## Reporting

`npm run report` writes `report.partial.json`. Do not write it by hand.

It contains only `status`, `app_url`, `start_command`, `summary`,
`implemented_features`, `assumptions`, and `tests_run` — the first five derived
from `parameters.json` and `idea_spec.json`, `tests_run` from the suite it just
ran.

Each `tests_run` entry is `{"command": string, "journey": string, "result": "passed" | "failed"}` — no other field names. An entry with any other shape is discarded and does not count.

A `success` report needs at least one `tests_run` entry and every entry's
`result` must be `"passed"`. `npm run report` applies that rule to the run it
observed, so a status below `success` means the app needs repairing, not the
report.

The runner owns the final `app_url`, the location-aware `start_command`,
`harness_checks`, and all telemetry.
