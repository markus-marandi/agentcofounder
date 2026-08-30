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

### The verbs, and what each one is built from

Read the idea for verbs, not for its domain. The kernel already expresses this
list; matching a verb to its row is the whole job.

| The idea says | Build it as |
|---|---|
| "put in", "add", "keep a list of" | the entity and its `fields` |
| "change", "fix", "correct" | the edit form — already there, nothing to configure |
| "get rid of", "remove" | delete with confirmation — already there |
| "mark it done/paid/returned", "clear that off" | an `actions` entry with `sets` and a `when` clause |
| "note down who/which", "assign it to" | an `actions` entry with `prompt` naming the field |
| "when it went out", "record the date" | `"@today"` (or `"@now"`) inside an action's `sets` |
| "just the ones that are…", "only show" | a `filters` entry |
| "find", "search for" | `features.search: true` |
| "how many", "total", "what's left" | a `derived` entry |
| "in one list", "newest first", "alphabetical" | `sort` |
| "roughly what kind of", "some sort of", "a rough sense of" | a `combobox` field — see below |

A verb that survives this table unmatched is the one place a new pure function
in `src/data/operations.ts` is justified. Everything above is configuration.

## 2. Model it as a web app

Every idea is built as a record-keeping web app, regardless of its surface
framing. An idea that sounds like a dashboard becomes an entity with a
`dashboard`-kind navigation entry (see the `web-app` skill's step 2); an idea
that sounds like a prototype or a landing page still becomes a real
collection with real persisted records — never a page or flow that only
looks finished.

`parameters.json` carries the `"web-app"` route and every executable decision.
Do not duplicate its entities, journeys, filters, or persistence in the spec.

## 3. Write idea_spec.json

At the application root:

```json
{
  "target_user": "",
  "assumptions": []
}
```

Keep this file small. The report uses the target user in its summary and carries
the assumptions; the generated journey suite derives from `parameters.json`.

## 4. Write parameters.json

Validate against `parameters.schema.json`. The kernel refuses to start on an
invalid file, so get it right before writing components.

Every `parameters.json` needs:

- `entities` — at least one, with its real fields. Use the idea's own words for
  `label` and `labelPlural`.
- `entities[].filters` — at least one meaningful way to narrow the collection.
- `entities[].derived` — at least one number worth showing.
- `entities[].actions` — one per state change the idea describes as a moment
  rather than an edit. Always give an action a `when` clause: it is what keeps
  "Mark returned" off a book that is already on the shelf, which is also what
  makes a repeated click impossible rather than merely harmless.
- `entities[].sort` — when the idea implies an order ("in one list", "newest
  first"). Omit it for insertion order.
- `features.limitations` — boundaries a person will actually hit. Be concrete
  ("data stays in this browser and does not sync"), never a disclaimer.
- `persistence.namespace` — a short slug specific to this product.

Field types are `text`, `longtext`, `number`, `date`, `select`, `combobox`,
`boolean`. Mark a field `unique` only when a duplicate would genuinely be a
mistake.

**`select` versus `combobox` is the decision most ideas leave open**, and
guessing wrong costs a real user something either way. A closed `select` is
right only when the set genuinely cannot grow — a status, a rating, a
priority. When the idea hedges — "roughly what kind of book", "some sort of
category", "a novel or a cookbook or a reference thing" — the hedge *is* the
answer: use a `combobox`. It offers the idea's own examples as `options` and
still accepts a value nobody anticipated, and the kernel folds a new spelling
into one already in use so "Cookbook" and "cookbook" stay one category. Record
the decision in `assumptions` either way.

Give `select` fields real `options`; the kernel rejects a `select` without
them. `combobox` `options` are suggestions, so they can be a short starting
set.

Choose a `theme.preset` that suits the subject rather than defaulting to the
first one.

## 5. Hand over

Load the `web-app` skill and follow it.
