---
name: mock-dashboard
description: Build an at-a-glance dashboard of one headline chart plus four supporting charts on the prebuilt kernel, backed by real persisted records. Selected by the product-analyzer skill.
---

# Mock dashboard route

`src/ui/DashboardGrid.tsx` renders one headline plot above four supporting
plots, responsive from one column to four. `src/ui/Chart.tsx` draws line, area,
bar, donut, sparkline, and single-figure plots as SVG with accessible summaries.
You should not need to write a chart.

## Steps

1. In `parameters.json`, write a `dashboard` block: one `main` plot and exactly
   four `sub` plots. Give each a title in the idea's own language.
2. Choose each plot's source honestly:
   - `entityGroup` (with `field`) — counts per distinct value of a real field.
   - `entityCount` — how many records there are.
   - `entitySum` (with `field`) — a real total.
   - `timeseries` / `categorical` — seeded sample figures, for history a
     browser-only app cannot have. The kernel labels these "sample figures"; do
     not remove that label.
   Prefer the entity-backed sources. A dashboard where every number is invented
   is a picture, not a product.
3. **The records have to come from somewhere.** Add a `collection` navigation
   entry so a person can add, edit, and delete the underlying records. A
   dashboard with no way to enter data fails the delivery floor.
4. Pick chart kinds that suit the data: `donut` or `bar` for a breakdown by
   category, `line` or `area` for change over time, `stat` for a single figure.
5. Set `theme.preset` to something suited to the subject.
6. Update `API.md` with the entities and how each plot derives from them.

## Tests

- Each plot renders and exposes its numbers by accessible name.
- Adding a record changes an entity-backed plot.
- The dashboard renders with no records at all and says there is no data yet,
  rather than drawing an empty frame.
- The full collection journey: add, edit, delete, filter, persist.

`src/ui/Chart.test.tsx` and `src/mock/generators.test.ts` are working examples.

## Finish

Run `npm test` and `npm run build`, then write `report.partial.json`.
