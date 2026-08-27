<!-- DEV ONLY: delete before freeze. See docs/starter.md "Pre-freeze cleanup". -->

# Decision log

Newest first. Each entry records what was decided and why, so a fresh agent
session does not relitigate it. Read alongside `AGENTS.md`.

## 2026-08-27 — Narrowed to the web-app route only (Markus)

**Supersedes** the "all five routes ship" decision below (2026-08-20). The
organizers confirmed on Slack the graded prompt will be "very similar in
structure and difficulty, with the same kind of app at the same scale" as
the public prompt — and that shape is now known precisely: 1 entity, 4
attributes, filter by category, 1 derived value, page-refresh persistence,
single user with no auth, and one deliberate ambiguity (the public "Book
Lending Tracker" idea's category field could be read as a fixed dropdown
or free text). That shape is squarely and only a `web-app`-route idea.

**So:** the harness now builds only the `web-app` route. `product-analyzer`
still extracts `idea_spec.json`/`parameters.json`, but its 5-way
classification and tie-break rules are gone — it always hands off to
`web-app`. `mock-dashboard`, `landing-page`, `prototype`, and `open-build`
are deleted (skills, CI matrix, fixtures), along with
`vendor/frontend-design` (its only consumers were the deleted routes). The
kernel and `parameters.schema.json` are untouched — they already support
this exact shape with zero new capability required.

**Accepted risk:** if the hidden grading prompt ever surprises us with a
genuinely different shape, there is no `open-build` fallback left to catch
it. This is a deliberate trade for lower token cost and a simpler, more
reliable single path, made against the organizer's own confirmation of
prompt similarity — not free of risk if that confirmation turns out wrong.

## 2026-08-20 — Architecture agreed (Markus + Elias)

**Prebuild the engineering, let the model do product.** The agent classifies the
idea into one of five routes, writes `parameters.json`, and assembles the app
from kernel primitives that already exist and already pass tests.

### Every route persists data

The rubric is 20 pts data & state persistence, 20 pts robustness, 15 pts API &
integration readiness. `contract-public/journeys.md` and the sample idea are
both record-keeping shaped. A purely visual landing page or click-through
prototype forfeits roughly 40 points.

**So:** all five routes ship, each keeps its visual identity, and each sits on a
real persisted store. Landing pages get a working waitlist capture with a saved
view; prototype screens remember input across clicks.

### Low-confidence fallback is route 5, open-build

The model decides freely when classification is uncertain. Bounded by the
non-negotiable floor in `README.md`, which every route must satisfy.

### Replacements forced by offline judging

| Original plan | Why it died | Replacement |
|---|---|---|
| Google / Brave search | `PI_OFFLINE=1`, judge blocks network | Committed `positioning.json` dataset |
| `npx hyperframes` | Network + package install | CSS/SVG animated hero in the seed |
| Supabase | External service, app must run standalone | `Repository` interface + localStorage adapter; other adapters documented, not shipped |
| BetterAuth | Needs a server, new dependency | `mockAuth` behind the same interface a real provider satisfies |
| Mock users in `.env` | `protected-paths.ts` blocks `.env*` writes | Committed `auth/seed-users.ts` |
| Tailwind | New dep, build cost, and long class strings are output tokens paid per element | Zero-dep CSS design system with semantic classes |

### External skills

`agentskills.io` is the spec Pi implements — a conformance target, not a
dependency. From `anthropics/skills` (Apache 2.0) we vendor exactly one skill
for run time, `frontend-design`, because every extra skill description is a
per-call token cost. `theme-factory`'s palettes are pre-baked into
`app-template/src/themes/presets.css` rather than loaded. `skill-creator` and
`webapp-testing` live in `tools/dev-skills/` for our editor only — `webapp-testing`
needs Playwright and Python, and would tempt the model to hold port 3000.

### Documentation

The original organizer README moved verbatim to `docs/starter.md`; `README.md`
was rewritten around our architecture. Organizer instructions must stay
accurate — `docs/organizer-checklist.md` references them.
