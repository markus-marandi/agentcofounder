---
name: product-analyzer
description: Classify a non-technical product idea into one of five build routes and write the idea_spec.json and parameters.json that drive assembly. Use this first, before writing any application code.
---

# Product analyzer

Two outputs, in this order: `idea_spec.json`, then `parameters.json`. Then load
the route skill named below and follow it.

## 1. Read the idea for these things

- Who it is for, and what goes wrong for them today.
- The **thing being kept track of** — the noun that gets added, listed, and
  changed. This is the primary entity, and there is almost always one, even when
  the idea sounds like a website rather than an application.
- Its attributes, and which of them are required.
- Every action the idea states or implies: adding, changing, removing, marking,
  narrowing a list, counting or totalling something.
- What the idea leaves unsaid.

## 2. Choose the route

Read the signals in order and take the first that clearly fits. Signals are
about **what the person asked for**, not about how impressive an output would be.

| Route | Choose when the idea asks for | Signals |
|---|---|---|
| `landing-page` | A page that explains and sells something not yet built | "landing page", "marketing site", "explain my idea", "get people to sign up", "waitlist" |
| `mock-dashboard` | An at-a-glance view of numbers over time | "dashboard", "metrics", "KPIs", "charts", "see how X is trending", "reporting" |
| `prototype` | To see and click a flow before it is built | "prototype", "mockup", "wireframe", "clickable", "show me what it would look like", "walk through the screens" |
| `web-app` | To actually do the work: keeping records, managing items | "track", "manage", "keep a list", "log", "organise", "know who has what" — and any idea describing add/edit/delete over a collection |
| `open-build` | Nothing above clearly fits, or the idea is too vague to classify | Competing signals, an unusual shape, or an idea that names no clear artefact |

Tie-breaks:

- A dashboard idea that also describes entering the underlying records is
  `web-app` with a dashboard view in `navigation`, not `mock-dashboard`.
- A landing page idea that also describes managing signups is still
  `landing-page`; add a second `collection` navigation entry for the signups.
- A prototype idea that names concrete records to store is `web-app`.
- When genuinely torn between two, choose `open-build` and build what the idea
  actually asks for.

Record the route and why in `idea_spec.json`.

## 3. Write idea_spec.json

At the application root:

```json
{
  "route": "",
  "route_rationale": "",
  "target_user": "",
  "problem": "",
  "primary_entity": { "name": "", "fields": [{ "name": "", "type": "", "required": true }] },
  "user_journeys": [],
  "filters": [],
  "derived_values": [],
  "persistence": "",
  "in_scope": [],
  "out_of_scope": [],
  "assumptions": []
}
```

`user_journeys` is the list you will test. Write each as something a person
does and can see the result of — "adds a book and sees it in the list", not
"the create function works". Include every journey the idea implies, not only
the ones it spells out.

## 4. Write parameters.json

Validate against `parameters.schema.json`. The kernel refuses to start on an
invalid file, so get it right before writing components.

Required on **every** route:

- `entities` — at least one, with its real fields. Use the idea's own words for
  `label` and `labelPlural`.
- `entities[].filters` — at least one meaningful way to narrow the collection.
- `entities[].derived` — at least one number worth showing.
- `features.limitations` — boundaries a person will actually hit. Be concrete
  ("data stays in this browser and does not sync"), never a disclaimer.
- `persistence.namespace` — a short slug specific to this product.

Route-specific blocks:

- `landing-page` — a `landing` block. `captureEntity` names the entity the form
  writes; give it real fields, not a single anonymous email box.
- `mock-dashboard` — a `dashboard` block with one `main` plot and exactly four
  `sub` plots. Prefer `entityGroup` / `entityCount` / `entitySum` sources so the
  charts show real records; use `timeseries` or `categorical` only for history
  the app cannot have, and the kernel will label those as illustrative.
- `prototype` — a `prototype` block whose screens follow the flow the idea
  describes, with `collects` naming fields gathered on each screen.

Field types are `text`, `longtext`, `number`, `date`, `select`, `boolean`.
Give `select` fields real `options`. Mark a field `unique` only when a duplicate
would genuinely be a mistake.

Choose a `theme.preset` that suits the subject rather than defaulting to the
first one.

## 5. Hand over

Load the skill named by the route: `landing-page`, `web-app`, `prototype`,
`mock-dashboard`, or `open-build`.
