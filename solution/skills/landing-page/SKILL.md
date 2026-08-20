---
name: landing-page
description: Build a marketing landing page with hero, supporting sections, and a working signup capture that persists, using the prebuilt kernel and offline positioning material. Selected by the product-analyzer skill.
---

# Landing page route

`src/ui/LandingPage.tsx` renders hero, subhero, features, comparison, FAQ, and
call-to-action sections from `parameters.landing.sections`, with an animated
CSS/SVG hero that respects reduced-motion preferences.

## The capture form is real

The page's form writes records through the repository. Signups survive a
refresh, and a second navigation entry lets someone review them. A landing page
whose form discards what it collects is a mock and fails the delivery floor.

Give `captureEntity` fields worth collecting — a name and an email, plus
whatever the idea suggests qualifies a lead. Mark the email `unique` so the same
person cannot be added twice.

## Steps

1. In `parameters.json`, write a `landing` block: `sections` in the order they
   should appear, `captureEntity`, and a `callToAction` in the idea's own voice.
2. Set `navigation` to two entries: the landing page (`kind: "landing"`) and a
   collection view of the captured signups (`kind: "collection"`).
3. Write `product.tagline` as the headline and `product.description` as the
   supporting sentence. These are the page's most important words — make them
   specific to this product, not generic startup copy.
4. Pick a `theme.preset` that fits the subject.
5. Read `src/content/positioning.json` for comparison material. It describes
   **general alternatives** — a spreadsheet, paper, a group chat, an enterprise
   suite — deliberately, because this machine has no network and cannot research
   real competitors. Never name a real company or invent facts about one.
   Choose the archetypes whose `appliesTo` matches this idea and rewrite their
   text in the idea's own terms.
6. Load the `frontend-design` skill before choosing typography, colour, and
   layout emphasis. A landing page is judged on whether it looks considered.
7. Update `API.md` with the capture entity.

## Tests

- The hero renders the headline and the call to action.
- Submitting the form with valid details stores a signup and confirms it.
- Submitting with a missing required field shows an error and stores nothing.
- Submitting the same email twice is rejected as a duplicate.
- A stored signup appears in the collection view.
- Signups survive a remount, standing in for a page refresh.

## Finish

Run `npm test` and `npm run build`, then write `report.partial.json`.
