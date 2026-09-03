# Component audit — `src/ui/*`

Inventory of every component in `src/ui`, what activates it, and whether it is
independently on/off or a primitive other components depend on. This is the
audit behind the `components` block in [`parameters.json`](parameters.json)
and its schema in [`parameters.schema.json`](parameters.schema.json).

## The 10 product-facing components

These are the pieces a `parameters.json` configuration actually turns on or
off — either directly (`navigation[].kind`, `features.auth`) or as a
dependency of one that is on.

| Component | File | Activated by | Depends on |
|---|---|---|---|
| `collectionView` | `CollectionView.tsx` | a `navigation` entry with `kind: "collection"` (the default route); row actions come from `entities[].actions` | `StatRow`, `RecordForm`, `EmptyState`, `Field`, `Button`, `Dropdown`, `Modal` |
| `dashboardGrid` | `DashboardGrid.tsx` | a `navigation` entry with `kind: "dashboard"` + a top-level `dashboard` block — `solution/skills/web-app/SKILL.md` now has the model add this by default | `Chart`, `Card`, `Badge` |
| `landingPage` | `LandingPage.tsx` | a `navigation` entry with `kind: "landing"` | `Field` |
| `prototypeFlow` | `PrototypeFlow.tsx` | a `navigation` entry with `kind: "screen"` + a top-level `prototype` block | `Field` |
| `authBar` | `AuthBar.tsx` | `features.auth: true` | — |
| `chart` | `Chart.tsx` | rendered only inside `dashboardGrid`; hand-drawn SVG, no charting dependency | — |
| `recordForm` | `RecordForm.tsx` | rendered only inside `collectionView`, for create/edit | `Field` |
| `field` | `Field.tsx` | one accessible control per declared field type, `combobox` included; rendered by `recordForm`, `landingPage`, `prototypeFlow`, and by `collectionView` for an action's inline prompt | — |
| `emptyState` | `EmptyState.tsx` | rendered by `collectionView` when a list has zero records or zero matches | — |
| `statRow` | `StatRow.tsx` | rendered by `collectionView` for `entity.derived` totals | — |

## Shell / cross-cutting (not in the registry)

Not product content — always compiled in, never independently toggled:

| Component | File | Role |
|---|---|---|
| `AppShell.tsx` | Chrome, identical in every app: sidebar rail with a mobile drawer, sticky header with the one search box, density and day-night wiring. Not configurable |
| `Logo.tsx` | Brand mark (`LogoMark`) and mark-plus-`product.name` wordmark (`Logo`), drawn inline so the mark takes the accent; same art as `public/logo.svg` and the `public/favicon.svg` the tab uses |
| `shellSearch.ts` | Carries the header's query to whichever view is on screen. Outside a shell the context is null and the view falls back to its own search box |
| `tools/api-contract.mjs` | Derives the HTTP contract, the JSON Schema per entity, and the Postgres table sketch from `parameters.json`. `npm run contract` writes `openapi.json`; the docs page appends the rest |
| `tools/docs-page.mjs` | Renders `API.md` as a page. Served at `/api-docs` by the `api-docs` plugin in `vite.config.ts`, and on port 3001 by `tools/serve-docs.mjs` (`npm run docs`). The sidebar's bottom link points at the first |
| `ErrorBoundary.tsx` | Wraps every routed view and every dashboard plot so one bad record can't blank the page |
| `Breadcrumbs.tsx` | Rendered above every `content` and `dashboard` view (`App.tsx`'s `View`) for wayfinding beyond the shell's own page title |

## Shared primitives

Not independently toggled — used wherever the component above them needs the
pattern, same file every time:

| Component | Used by |
|---|---|
| `Badge.tsx` | `CollectionView`'s row cells for a `select`/`combobox`/`boolean` field would be the obvious next use, but the auto-generated journey suite (`tools/generate-journeys.mjs`) asserts those cells' exact text with `getByText`, which throws on a second nested text-matching element — so `Badge` stays out of the row cells and lives on `DashboardGrid`'s headline plot instead, where nothing generated depends on the DOM shape |
| `Button.tsx` | `CollectionView`'s `style: "primary"` row actions and inline-prompt confirm button, replacing what used to be a second, hand-duplicated copy of the same class string |
| `Dropdown.tsx` | `CollectionView`'s Export/Import JSON, collapsed into one overflow menu instead of two loose text buttons |
| `Card.tsx` | `DashboardGrid`'s plot frames |

`Tabs.tsx` and `ButtonGroup.tsx` are built and unused. Both are natural fits
for the equals-mode filter control, but `generate-journeys.mjs` hard-codes
that control as a native `<select id="filter-<field>">` addressed by
`selectOptions` — the "kernel's published contract" its own header comment
names. Swapping it for either component would need the generator changed
too, on the one file every judged run's passing test suite depends on; left
alone until that's worth doing deliberately, not as a side effect of a
styling pass.

## `components` tracking block

`parameters.json` now carries a `components` map recording which of the 10
are actually reachable given the rest of the current configuration — a
readable audit trail, not a second control surface. **The real switches
remain `navigation[].kind`, the presence of `dashboard`/`landing`/`prototype`,
and `features.auth`.** Change one of those and update `components` to match;
nothing currently derives it automatically or fails the build if it drifts.
Automating that cross-check (compute it in `src/kernel/config.ts` instead of
hand-maintaining it, or validate it against `navigation`/`features` in
`src/validate-parameters.ts`) is follow-up work, not done here.

Current defaults, given the seed's `navigation` (one `collection` entry) and
`features.auth: false`:

| Component | On |
|---|---|
| `collectionView` | true |
| `recordForm` | true |
| `field` | true |
| `emptyState` | true |
| `statRow` | true |
| `dashboardGrid` | false |
| `chart` | false |
| `landingPage` | false |
| `prototypeFlow` | false |
| `authBar` | false |
