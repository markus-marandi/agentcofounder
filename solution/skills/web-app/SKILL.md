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
2. Set `navigation`. The collection is the first entry. Add one entry per
   distinct area the idea describes — a second entity, or a summary view
   (`kind: "dashboard"`, which also needs a `dashboard` block) — and then fill
   the menu out to at least four entries with `kind: "content"` sections named
   for what this product's owner would look for. A `content` entry renders the
   real content view, not a stub, so the menu is never a lie; a one-item rail
   just reads as an unfinished app. Give every content entry its own `body` —
   a sentence or two about that section, in this product's words. Without one
   they all print the product description and the menu leads to four copies of
   the same page.
3. `features.search` is on in the shell whatever the configuration says — the
   header always carries the search field — so leave `search: true`.
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
7. Use `src/ui/CollectionView.tsx`, which already provides add, edit, delete
   with confirmation, row actions, filters, search, derived totals, empty
   states, validation messages, and storage-failure recovery.
8. Write only what is missing. A status that changes other fields is an
   `action`, not new code. If the idea needs a rule the kernel genuinely cannot
   express — a relationship between two entities, an arithmetic rule — add it to
   `src/data/operations.ts` as a pure function and cover it with tests, keeping
   it out of components.
9. Do not edit `API.md`; the settle-time verifier derives its entity section
   from `parameters.json`. Document a genuinely new operation beside its code.

## Tests

The settle-time verifier derives `src/journeys.generated.test.tsx` from
`parameters.json`: add, required-field rejection, edit, confirmed delete,
actions and their opposite states, filters, derived values, open combobox
values, search, and persistence.

That makes the suite a consequence of the configuration. A journey you expected
and did not get is a configuration gap: the field, filter, action, or derived
value is missing from `parameters.json`. Add it there. Never edit the generated
file.

Write a test by hand only for a rule the kernel cannot express, and put it
beside the pure function that implements it. `src/ui/CollectionView.test.tsx`
and `src/ui/CollectionView.actions.test.tsx` are the kernel's own examples.

## Finish

Settle after the configuration and any necessary code are ready. Do not run
`npm run api`, `npm run journeys`, `npm test`, `npm run build`, or
`npm run report`; the verifier does so once, writes the derived report, and
returns condensed failures. Repair the cause and settle again when asked.
