---
name: product-analyzer
description: Extract a non-technical product idea into idea_spec.json and parameters.json for the web-app route, then hand off to the web-app skill. Use this first, before writing any application code.
---

# Product analyzer

Two outputs, in this order: `idea_spec.json`, then `parameters.json`. Then load
the `web-app` skill and follow it.

## 1. Read the idea for these things

- Who it is for, and what goes wrong for them today.
- The **thing being kept track of** — the noun that gets added, listed, and
  changed. This is the primary entity, and there is almost always one, even when
  the idea sounds like a website rather than an application.
- Its attributes, and which of them are required.
- Every action the idea states or implies: adding, changing, removing, marking,
  narrowing a list, counting or totalling something.
- What the idea leaves unsaid.

## 2. Model it as a web app

Every idea is built as a record-keeping web app, regardless of its surface
framing. An idea that sounds like a dashboard becomes an entity with a
`dashboard`-kind navigation entry (see the `web-app` skill's step 2); an idea
that sounds like a prototype or a landing page still becomes a real
collection with real persisted records — never a page or flow that only
looks finished.

`route` in `idea_spec.json` is always `"web-app"`; `route_rationale` is a
one-line confirmation that the idea is record-keeping shaped, not a real
choice between options.

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

Every `parameters.json` needs:

- `entities` — at least one, with its real fields. Use the idea's own words for
  `label` and `labelPlural`.
- `entities[].filters` — at least one meaningful way to narrow the collection.
- `entities[].derived` — at least one number worth showing.
- `features.limitations` — boundaries a person will actually hit. Be concrete
  ("data stays in this browser and does not sync"), never a disclaimer.
- `persistence.namespace` — a short slug specific to this product.

Field types are `text`, `longtext`, `number`, `date`, `select`, `boolean`.
Give `select` fields real `options`. Mark a field `unique` only when a duplicate
would genuinely be a mistake.

Choose a `theme.preset` that suits the subject rather than defaulting to the
first one.

## 5. Hand over

Load the `web-app` skill and follow it.
