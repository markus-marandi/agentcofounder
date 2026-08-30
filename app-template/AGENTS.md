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
5. On settle, the verifier regenerates `src/journeys.generated.test.tsx` from
   the same file, runs tests and the build, and derives `report.partial.json`.

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
8. `API.md` describes the data boundary.
9. Runs at `http://localhost:3000` and leaves no process behind.

A landing page and a walkthrough prototype meet this floor too: their capture
forms write real records. A form that discards what it collects is a mock.

## What is already available

| Need | Use |
|---|---|
| Read or write records | `src/data/repository.ts` via `src/kernel/useRepository.ts` |
| Browser persistence | `src/data/localStorageAdapter.ts` (recovers from corrupt data) |
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
| Journey suite and report | settle-time verifier, derived from `parameters.json` and real test results |
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
- **Do not hand-write the journey suite or edit `src/journeys.generated.test.tsx`.**
  A missing journey is a missing field, filter, action, or derived value in
  `parameters.json` — fix it there.
- **Do not run `npm run journeys`, `npm test`, `npm run build`, or
  `npm run report`.** Settle when the work is ready; the verifier owns those
  deterministic steps and returns condensed failures for repair.

## Reporting

The verifier writes `report.partial.json` from configuration and actual test
results; do not create or edit it. A non-success result means repair the app.
The outer runner owns final URLs, commands, harness checks, and telemetry.
