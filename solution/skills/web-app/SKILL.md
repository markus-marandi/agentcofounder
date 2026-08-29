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
5. Set `entities[].actions` for every state change the idea treats as a moment
   rather than an edit. A worked example, for "when someone borrows one I want
   to note down their name, and when it comes back I want to clear that off":

   ```jsonc
   "actions": [
     {
       "id": "lend",
       "label": "Lend",
       "prompt": "borrower",              // collects this field inline, in the row
       "sets": { "lentOn": "@today" },    // resolved when the button is clicked
       "when": { "field": "borrower", "mode": "falsy" },
       "style": "primary"
     },
     {
       "id": "return",
       "label": "Mark returned",
       "sets": { "borrower": null, "lentOn": null },
       "when": { "field": "borrower", "mode": "truthy" }
     }
   ]
   ```

   Two things earn their keep here. `prompt` collects one value in the row, so
   lending is a click and a name rather than an edit form. `when` means only
   one of the pair is ever offered, so the state is unambiguous and a repeated
   click has nothing to repeat. Add `"confirm": true` to an action a person
   would not want to undo.
6. Set `entities[].sort` when the idea implies an order. Omit it otherwise.
7. Run the app. `src/ui/CollectionView.tsx` already provides add, edit, delete
   with confirmation, row actions, filters, search, derived totals, empty
   states, validation messages, and storage-failure recovery.
8. Write only what is missing. A status that changes other fields is an
   `action`, not new code. If the idea needs a rule the kernel genuinely cannot
   express — a relationship between two entities, an arithmetic rule — add it to
   `src/data/operations.ts` as a pure function and cover it with tests, keeping
   it out of components.
9. Update `API.md`: replace the entities section with what you actually built,
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
- data surviving a remount, which stands in for a page refresh;
- each configured action, including that the record ends up in the state the
  action names and that the opposite action is offered afterwards.

An action button's accessible name is `"<label>: <record title>"`, and its
confirm or submit button is `"Confirm <label lowercased>: <record title>"` —
`getByRole("button", { name: "Mark returned: Hamlet" })`.

`src/ui/CollectionView.test.tsx` is a working example of the first six, and
`src/ui/CollectionView.actions.test.tsx` of the action journeys.

## Finish

Run `npm test` and `npm run build`. Then write `report.partial.json`, listing
each journey from `idea_spec.json` in `tests_run`.
