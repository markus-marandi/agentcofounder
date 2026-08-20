---
name: open-build
description: Build an application whose shape none of the four named routes fits, composing the prebuilt kernel freely while still meeting the delivery floor. Selected by the product-analyzer skill when classification is uncertain.
---

# Open build route

Reached when the idea does not fit `landing-page`, `web-app`, `prototype`, or
`mock-dashboard`, or is too vague to classify. Build what the idea actually asks
for. The freedom is in the shape, not in the floor.

## The floor still applies

1. At least one persisted entity, reached only through the repository boundary.
2. Create, edit, and delete.
3. At least one filter and at least one derived value.
4. Data survives a page refresh.
5. At least one passing test per journey; never skipped or todo.
6. Works on a narrow screen and a wide one.
7. `features.limitations` lists boundaries a person will hit.
8. `API.md` describes the data boundary as built.
9. Runs at `http://localhost:3000` and leaves nothing behind.

If a design cannot meet the floor, it is the wrong design for this idea.

## How to build

1. Take the interpretation the idea most plainly supports. When two readings are
   equally plausible, build the one that does more of what the person described,
   and record the choice in `assumptions`.
2. Compose the kernel: `CollectionView` for anything list-shaped, `DashboardGrid`
   for anything summary-shaped, `LandingPage` for anything page-shaped,
   `PrototypeFlow` for anything sequential. `navigation` can mix all four kinds
   in one app, and the kernel picks its chrome from how many entries there are.
3. Write a new component only for something none of them expresses. Put domain
   rules in `src/data/operations.ts` as pure functions, never inside a component.
4. Load the `frontend-design` skill before making visual decisions.
5. Update `API.md` with everything you added.

## Tests

Cover every journey in `idea_spec.json` through the interface, querying by
accessible name. Any new pure function in `operations.ts` gets its own unit
tests, including its edge cases.

## Finish

Run `npm test` and `npm run build`, then write `report.partial.json`, listing
every journey from `idea_spec.json` in `tests_run`.
