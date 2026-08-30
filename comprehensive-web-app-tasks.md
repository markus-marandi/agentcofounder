# Scope, rewritten against the actual contract

Status: supersedes the previous version of this document in full. The prior
plan (comprehensive IAM/RBAC, a pluggable search-provider boundary, a
config-driven settings/users module, auto-generated API docs, and a vendored
Tailwind Plus showcase dashboard) was written as if this were a generic
"comprehensive web app" product. It is not. Re-read against
[`docs/starter.md`](docs/starter.md), [`contract-public/journeys.md`](contract-public/journeys.md),
[`contract-public/result.schema.json`](contract-public/result.schema.json), and
the published scoring rules, most of that plan does not earn points and some
of it actively risked losing them. This version keeps only what traces to a
scored line item.

## What is actually scored

1. **Qualification gate**: `result.json` conforms to
   [`result.schema.json`](contract-public/result.schema.json), the app starts
   clean at `http://localhost:3000`, and every recorded journey/test passes.
2. **Primary ranking metric, token efficiency**, among qualifying entries:
   `input_tokens + output_tokens*3 + cache_read_tokens*0.1`. This is a
   property of the *harness* (`solution/`, `src/`) — how cheaply one
   autonomous Pi run turns an idea into a working app — not of how many
   features the generated app has.
3. **Secondary, 100-pt app readiness**, scored on whatever the harness
   generated for the judging idea:
   - Usability & UX — 30
   - Data & state persistence — 20
   - Robustness — 20
   - API & integration readiness — 15
   - Maintainability & extensibility — 15
4. The five behaviors in `journeys.md` are the only feature surface the
   generated app is checked against: add/show a record, edit/delete, filter
   by a category or state, show a derived value, survive a refresh. The
   public dev prompt (`skeleton.txt` shape) and the 11 ambiguity fixtures are
   all **one entity, one buried-ambiguity category field, one lend/return
   action pair, single user** — not multi-entity, not multi-role.

Nothing above mentions authentication depth, role-based access control,
search architecture, a settings page, or auto-generated API manifests. Any
work item that doesn't trace to one of the four points above is scope creep
by definition, however generically useful it'd be in a real product.

## Cut, not deferred

These were P0 in the old plan. They're not "later" — they're the wrong thing
to build for this contract, and worse, would have cost real budget getting
there:

- **Predefined IAM / enforced authorization (RBAC kernel, policy engine,
  permission matrix, users CRUD directory).** `journeys.md` never mentions
  roles. The web-app skill's own rule (see below) is "demonstration roles,
  clearly labelled" — the existing `mockAuth.ts` + `AuthBar.tsx` (~120 lines
  total) already clears that bar. A policy DSL with resource/action/role
  cross-validation is solving a problem the rubric doesn't ask and the public
  fixtures don't exercise (all single-user).
- **Search-provider abstraction** (pluggable interface, permission-aware
  filtering, a documented future server adapter). The non-negotiable
  constraint is *no network access, no search service* — an abstraction
  layer for an adapter that can never run in this contest is pure overhead.
  The existing 22-line substring index in `searchIndex.ts` already satisfies
  "features.search" per the skill.
- **Settings/users pages as a system module.** Not in `journeys.md`, not in
  the 100-pt rubric, not something the web-app skill instructs the model to
  configure. Building it speculatively grows the schema/kernel surface that
  ships in every run for zero scoring return.
- **Auto-generated `API.md` / `api-manifest.json` build step.** The skill
  already has the model hand-update `API.md`'s entities section per run
  (`solution/skills/web-app/SKILL.md`, step 9). A generator is nice-to-have
  engineering, not a scored requirement, and it's more code the kernel has to
  carry on every invocation.
- **The Tailwind Plus showcase block** (`app-template/src/ui/blocks/`,
  1352-line `HomeScreenSidebar.tsx`, the `kind: "showcase"` nav type, and the
  45-subcategory vendoring backlog in `docs/tailwind-plus-catalog/`). Already
  removed from the tree in this pass. Three independent problems with it:
  1. It rendered static illustrative sample data (deploy pipelines, team
     rosters, a fake calendar) with zero wiring to `entities`/repository —
     nothing about it could ever appear in a judged run's actual feature set.
  2. It shipped in the *default* `parameters.json` as a live nav entry. The
     web-app skill tells the model "do not invent sections to look fuller"
     but never told it to strip the showcase entry, so an unmodified run
     could have shown a judge an irrelevant fake dashboard alongside (or
     instead of) the real single-entity app for the idea. That's a direct
     risk to the 30-pt UX score, not a neutral unused feature.
  3. It cost schema/type/context surface (schema enum entries, kernel types,
     a registry, a README) on every single run, forever, for a page that
     never scores. Deleted rather than frozen — freezing still leaves the
     dead weight; there was nothing here worth preserving for later since it
     was never on the path to a judged score.

## What Tailwind Plus adoption is actually for, and stays

The decision to move to Tailwind CSS + Tailwind Plus's Application UI
patterns was correct — Usability & UX is the single largest rubric category
(30/100), and it's scored on the app the harness *actually generates for the
idea*, which is always built from the 10 real product-facing components
audited in [`app-template/COMPONENTS.md`](app-template/COMPONENTS.md):
`collectionView`, `dashboardGrid`, `landingPage`, `prototypeFlow`, `authBar`,
`chart`, `recordForm`, `field`, `emptyState`, `statRow`. Restyling *those* —
already substantially done (`Card`/`Badge`/`Button`/`ButtonGroup` primitives
extracted, `Field.tsx` restyled off the forms catalog) — is the correct,
in-scope use of that budget. The mistake was spending the same budget vendoring
a page that those ten components don't use and that no scored run reaches.

## Where effort actually goes now

### A. Harness token efficiency — the primary ranking metric

This is `solution/` and `src/`, not `app-template/`. It's the only axis that
ranks qualifying entries against each other, so it's the highest-leverage
place to spend remaining time.

- [ ] Measure current token cost per run (`npm run challenge` against
  `docs/fixtures/skeleton.txt` and a few of the 11 ambiguity fixtures) and
  record a baseline in `input_tokens`/`output_tokens`/`cache_read_tokens`
  from the resulting `result.json`, so later changes can be compared.
- [ ] Review `solution/system-prompt.md` and
  `solution/skills/{product-analyzer,web-app}/SKILL.md` for length — every
  token in these is paid on every run. Cut instructional text that doesn't
  change model behavior on the fixture set.
- [ ] Check `CHALLENGE_THINKING` is `off` by default (per `docs/starter.md`)
  and only raise it with a measured completion-quality delta to justify the
  extra output-token cost (weighted 3x).
- [ ] Look at deliberate prompt caching (`solution/extensions/`) — cache
  reads are weighted 0.1x vs output's 3x, so shifting repeated context
  (schema, skill text) into a cached prefix is a direct efficiency win.
  Verify `cache_read_tokens`/`cache_write_tokens` in a real run's
  `result.json` to see whether Pi is caching anything today.
- [ ] Re-check whether one autonomous Pi invocation (the starter's current
  strategy) is beaten by a cheaper alternative — a shorter prompt, a more
  constrained tool set, or orchestration only where `verify-loop.ts`'s
  repair path actually fires on the fixture set. Don't add orchestration
  that isn't earning its token cost.

### B. Kernel robustness across arbitrary single-entity domains

The judged idea is unknown, but its *shape* is fixed by `journeys.md` and
demonstrated by the 11-fixture ambiguity batch
([`docs/fixtures/README.md`](docs/fixtures/README.md)): one entity, a
buried-ambiguity category field, a lend/return action pair, a derived value,
single user. This is what "Robustness" (20 pts) and "Usability & UX" (30
pts) actually get measured against.

- [ ] Run the harness against all 11 `ambiguity-*.txt` fixtures (not just
  `skeleton.txt`) and confirm the combobox ambiguity resolves the same way
  regardless of domain wording, per the fixture README's own stated purpose.
- [ ] Confirm validation/error states in `CollectionView.tsx`/`Field.tsx`
  read cleanly for each fixture's data shape — required-field rejection,
  empty states, filter-with-zero-results — since "validation feedback" and
  "clean error messages" are named explicitly under the UX rubric line.
  This should be a self-service check when the app itself is run.
- [ ] Run `docs/fixtures/web-app.txt` (the broader stress test: extra field,
  extra filter, a date field) to catch what the tight skeleton shape alone
  wouldn't.
- [ ] Keep growing `entities[].actions`/`combobox`/`sort` coverage (2a in the
  old plan, already largely done) only where a fixture or the dev prompt
  actually exercises it — not speculatively.

### C. Data/state persistence and API readiness — decided, closed

`Repository` → `StorageAdapter` → `localStorage` (`src/data/repository.ts`,
`src/data/localStorageAdapter.ts`, `src/kernel/useRepository.ts`) already
satisfies "decoupled component boundaries" (API & Integration Readiness,
15 pts) and "reliable state handling across refreshes" (Data & State
Persistence, 20 pts). Reviewed against both rubric lines directly; these are
the locked decisions, not left open for later:

- [x] Single write boundary — every mutating call in `CollectionView.tsx`,
  `LandingPage.tsx`, `PrototypeFlow.tsx` routes through `useRepository().run()`,
  so a storage failure always surfaces as a UI message, never data loss with
  no explanation or a blank screen.
- [x] Corrupt/malformed stored JSON degrades to an empty collection, not a
  crash; bad entries (missing `id`, duplicate `id`) are dropped on read.
- [x] Persistence read is synchronous (`localStorage.getItem`), so first
  paint after a refresh already has correct data — deliberately no loading
  state for this.
- [x] Derived values (`StatRow`) are computed live from the current record
  set on every render, never stored redundantly — no denormalization drift
  possible by construction.
- [x] Cross-tab sync via the `storage` event, last-write-wins, cache
  invalidated and reloaded on change. Previously wired but untested — closed
  in `src/data/repository.test.ts` (`repository.test.ts`'s "localStorage
  adapter" describe block: same-key notify, unsubscribe stops it, `key: null`
  clear-all notifies, unrelated key doesn't, and one integration-level test
  proving `Repository.list()` actually reflects another tab's write).
- [x] Namespacing: `namespace:collection` per entity avoids in-app
  collisions; `persistence.namespace` is already specified as an
  idea-specific slug in `solution/skills/product-analyzer/SKILL.md:102` and
  schema-validated as a slug, so separate runs on the same `localhost:3000`
  origin don't bleed into each other.

Explicit non-goals — decided against, not deferred, so they don't get
re-opened mid-build:

- No stored-record envelope, version field, or migration policy.
  `parameters.json` is fixed at build time per run; nothing ever migrates a
  persisted shape within a judged run. Same class of mistake as the cut
  IAM/search-provider work — solving a problem the contract can't exercise.
- No relational/normalized storage. One flat array per entity,
  `{id, createdAt, ...fields}`. Matches the contract's own ban on
  cross-entity ownership modeling without an explicit policy.
- No conflict resolution beyond last-write-wins across tabs — a merge/CRDT
  layer is unbuildable and untestable inside a single-user offline fixture
  set.
- No kernel-level `updatedAt`/audit trail. An idea that needs "last changed"
  gets it as a normal field via `entities[].actions.sets`, not new kernel
  surface.

- [ ] No further action needed on auth/search beyond what's in `src/auth/`
  and `src/data/searchIndex.ts` unless a specific fixture run shows a gap.

### D. Maintainability — mostly a function of what we removed

- [ ] `app-template/COMPONENTS.md` and the `components` tracking block in
  `parameters.json` are still hand-maintained with an acknowledged drift
  risk (nothing derives or validates it automatically). Low-cost fix:
  compute it in `src/kernel/config.ts` or check it in
  `src/validate-parameters.ts` instead of trusting a hand-edited table —
  worth doing since "clean project layout... legible code" is a named 15-pt
  category and this is a known, cheap, pre-identified gap.
- [ ] No new abstraction layers, provider interfaces, or system modules
  without first checking they trace to one of the four scored items above.

## Definition of done (rewritten)

- [ ] `result.json` at repo root and `output/app/result.json` both validate
  against `contract-public/result.schema.json` on a clean run.
- [ ] `npm run challenge` against the dev prompt and all 11 ambiguity
  fixtures produces a `status: "success"` result with the five `journeys.md`
  behaviors present in `tests_run`, none failed.
- [ ] Measured token efficiency (input + output×3 + cache_read×0.1) recorded
  as a baseline, with at least one attempted reduction (prompt length, model
  choice, or caching) measured against it.
- [ ] No dead surface in `app-template/`: every schema property, kernel
  type, and committed component either is reachable from `parameters.json`
  today or is removed.
- [ ] `npm run check` is green at the repository root.
