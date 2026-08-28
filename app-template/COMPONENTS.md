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
| `collectionView` | `CollectionView.tsx` | a `navigation` entry with `kind: "collection"` (the default route) | `StatRow`, `RecordForm`, `EmptyState` |
| `dashboardGrid` | `DashboardGrid.tsx` | a `navigation` entry with `kind: "dashboard"` + a top-level `dashboard` block | `Chart` |
| `landingPage` | `LandingPage.tsx` | a `navigation` entry with `kind: "landing"` | `Field` |
| `prototypeFlow` | `PrototypeFlow.tsx` | a `navigation` entry with `kind: "screen"` + a top-level `prototype` block | `Field` |
| `authBar` | `AuthBar.tsx` | `features.auth: true` | — |
| `chart` | `Chart.tsx` | rendered only inside `dashboardGrid`; hand-drawn SVG, no charting dependency | — |
| `recordForm` | `RecordForm.tsx` | rendered only inside `collectionView`, for create/edit | `Field` |
| `field` | `Field.tsx` | one accessible control per declared field type; rendered by `recordForm`, `landingPage`, `prototypeFlow` | — |
| `emptyState` | `EmptyState.tsx` | rendered by `collectionView` when a list has zero records or zero matches | — |
| `statRow` | `StatRow.tsx` | rendered by `collectionView` for `entity.derived` totals | — |

## Shell / cross-cutting (not in the registry)

Not product content — always compiled in, never independently toggled:

| Component | File | Role |
|---|---|---|
| `AppShell.tsx` | Chrome: header, nav (bar/sidebar/none — picked from `navigation.length`), theme/density wiring |
| `ErrorBoundary.tsx` | Wraps every routed view and every dashboard plot so one bad record can't blank the page |
| `Limitations.tsx` | Renders `features.limitations`; empty array renders nothing, so there is no separate on/off flag |

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
