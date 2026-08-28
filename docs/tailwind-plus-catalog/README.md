# Tailwind Plus Application UI catalog

Backlog for future `app-template/src/ui/blocks/` showcase blocks (see that
directory's own README for the vendoring process). Application UI has 45
subcategories across ~400+ style variants — these files cover one canonical
example per subcategory, not every variant, and notes/links only, not pasted
source. Re-fetch the real code from Tailwind Plus when actually vendoring.

| File | Covers |
|---|---|
| [shells-headings-data-lists.md](shells-headings-data-lists.md) | Application Shells, Headings, Data Display, Lists |
| [forms.md](forms.md) | Forms (all 10 subcategories) |
| [feedback-navigation-overlays.md](feedback-navigation-overlays.md) | Feedback, Navigation, Overlays |
| [elements-layout.md](elements-layout.md) | Elements, Layout |

## Cheapest, most relevant next picks

Cross-referencing all four files, for a deployments/analytics-style
dashboard, in rough priority order:

1. **Stats "With trending"** (data display) and **Feeds "Simple with icons"**
   (lists) — dependency-free, zero external assets, map directly onto a KPI
   row and the activity feed already sketched in `HomeScreenSidebar.tsx`.
2. **Cards** (layout) — the base panel every stat tile/chart/list would sit
   in; worth a shared `<Card>` primitive rather than one-off vendoring.
3. **Badges**, **Buttons**, **Button Groups** (elements) — deploy-status
   tags, primary actions, time-range toggles. All static, no deps.
4. **Notifications** toast and **Modal Dialogs** confirm/success (overlays)
   — deploy-triggered/succeeded feedback, both trivial and asset-free.
5. **Tables "Simple"** (lists) — a plain records table, asset-free.

## Known offline-safety flags across all four files

Every subcategory needing a swap repeats one of two problems, both already
solved once in `HomeScreenSidebar.tsx`:

- **Photo avatars** (Unsplash URLs) — Avatars, and several list/calendar/shell
  examples reusing the same "Leslie Alexander / Michael Foster / ..." set →
  swap for the `Avatar` initials helper.
- **Logo assets** (`tailwindcss.com/plus-assets/...svg`) — Sign-in and
  Registration, Navbars, Sidebar Navigation, the three Application Shells →
  swap for an inline SVG or `parameters.product.name` monogram, as
  `HomeScreenSidebar.tsx`'s `Logo()` already does.

## Overlap with existing components — check before vendoring

- `app-template/src/ui/EmptyState.tsx` already covers Empty States'
  "Simple"/"dashed border" variants (a restyle at most).
- `app-template/src/ui/ErrorBoundary.tsx` already covers the error-alert
  case; Tailwind Plus Alerts mainly add value for non-error info/warning
  banners.
- Sidebar Navigation overlaps with the already-vendored
  `HomeScreenSidebar.tsx` — compare before vendoring to avoid duplication.

## `Field.tsx` field-type fit (from forms.md)

Input Groups, Textareas, and Select Menus map ~1:1 onto the existing
`text`/`longtext`/`select` types. Toggles is a drop-in skin for `boolean`.
Radio Groups and Checkboxes don't fit the current `FieldSpec` union (would
need new field types — single-select-from-a-short-list, and a multi-select
checkbox group, respectively). Form Layouts, Sign-in/Registration, and
Action Panels are full pages, not field primitives — `ui/blocks/` candidates.
