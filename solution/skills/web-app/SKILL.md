---
name: web-app
description: Build a comprehensive record-keeping web application on the prebuilt kernel, with full create, edit, delete, filtering, search, derived values, and browser persistence. Selected by the product-analyzer skill.
---

# Web app route

The kernel already implements this route. Most of the work is configuration.

## Steps

1. Confirm `parameters.json` has `route: "web-app"` and every entity the idea
   needs, each with real fields, at least one filter, and at least one derived
   value.
2. Set `navigation`. One collection is one entry. Add more only when the idea
   describes distinct areas — a second entity, or a summary view (`kind:
   "dashboard"`, which also needs a `dashboard` block). Do not invent sections
   to look fuller: the kernel drops navigation entirely for a single view, which
   is the right result for a single-purpose app.
3. Set `features.search` to `true` when the collection will grow past a screenful
   or the idea mentions finding things.
4. Set `features.auth` to `true` only when the idea distinguishes between kinds
   of people. It shows demonstration roles, clearly labelled — never present it
   as a real login.
5. Run the app. `src/ui/CollectionView.tsx` already provides add, edit, delete
   with confirmation, filters, search, derived totals, empty states, validation
   messages, and storage-failure recovery.
6. Write only what is missing. If the idea needs a rule the kernel does not
   express — a status that changes other fields, a relationship between two
   entities — add it to `src/data/operations.ts` as a pure function and cover it
   with tests, keeping it out of components.
7. Update `API.md`: replace the entities section with what you actually built,
   and note any new operation.

## Tests

Write one test per journey in `idea_spec.json`, through the interface. Query by
accessible name — `getByRole("button", { name: "Remove Hamlet" })` — never by
class name or DOM position.

Cover, at minimum:

- adding a record and seeing it listed;
- rejecting a submission with a missing required field, and the record not appearing;
- editing an existing record;
- deleting, including the confirmation step;
- filtering, and that a derived value tracks the filtered set;
- data surviving a remount, which stands in for a page refresh.

`src/ui/CollectionView.test.tsx` is a working example of all six.

## Finish

Run `npm test` and `npm run build`. Then write `report.partial.json`, listing
each journey from `idea_spec.json` in `tests_run`.
