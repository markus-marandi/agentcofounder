---
name: prototype
description: Build a clickable multi-screen walkthrough that carries state between screens and stores a real record on completion, using the prebuilt kernel. Selected by the product-analyzer skill.
---

# Prototype route

`src/ui/PrototypeFlow.tsx` renders a screen at a time with progress dots, back
and continue controls, per-screen validation, and a completion state. What was
typed on an earlier screen is still there on the way back.

## What makes it a prototype rather than a mock

Screens are navigable in order, input is carried between them, and finishing
writes one real record. Nothing is faked with a static image or a dead button.
Say plainly in `features.limitations` what the walkthrough does not do.

## Steps

1. In `parameters.json`, write a `prototype` block. Each screen gets an `id`, a
   `title`, a short `body`, and `collects` naming the fields gathered there.
   Follow the sequence the idea describes; two to five screens is usually right.
2. Name the entity the flow builds in `prototype.entity`, and declare its fields
   in `entities`. Every name in `collects` must be one of them.
3. Set `navigation` to two entries: the walkthrough (`kind: "screen"`) and a
   collection view of what it produced (`kind: "collection"`), so a person can
   see the result and edit or delete it.
4. Load the `frontend-design` skill before choosing typography and colour — a
   prototype's whole purpose is to show what the thing would feel like.
5. Update `API.md` with the entity the flow produces.

## Tests

- The first screen renders and shows its position in the sequence.
- Continue moves forward; back returns with the earlier answers still filled in.
- A required field left empty blocks continuing and shows an error.
- Finishing stores a record and confirms it.
- The stored record appears in the collection view.
- Records survive a remount, standing in for a page refresh.

## Finish

Run `npm test` and `npm run build`, then write `report.partial.json`.
