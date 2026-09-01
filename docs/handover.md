# Handover

Decisions and closed gaps, by 100-pt rubric category. Written down so they
aren't re-derived or re-opened by whoever picks this up next.

## Data & State Persistence (20 pts)

`Repository` → `StorageAdapter` → `localStorage`
(`app-template/src/data/repository.ts`, `localStorageAdapter.ts`,
`app-template/src/kernel/useRepository.ts`).

Already locked in, keep as-is — no more work here:

- Single write boundary: components never touch `localStorage` directly,
  only `Repository`. Confirmed every mutating call site (`CollectionView`,
  `LandingPage`, `PrototypeFlow`) routes through `useRepository().run()` —
  storage failure always surfaces as a UI message, never a blank screen or
  silent loss.
- Malformed/corrupt stored JSON → empty collection, not a crash. Bad
  entries (no `id`, duplicate `id`) dropped on read, one loop, tested.
- Read is synchronous (`localStorage.getItem`) — first paint after refresh
  already has correct data. No loading state needed for persistence; don't
  add one.
- Derived values (`StatRow`) computed live from the current record set
  every render — never stored redundantly. No denormalization drift
  possible by construction.
- Cross-tab sync via the `storage` event, cache invalidated and reloaded —
  wired, correct, last-write-wins.
- `id` generation collision-safe within the same tick (counter + random
  suffix, no `crypto.randomUUID` dependency for jsdom compat).
- Namespacing: `namespace:collection` key per entity avoids collision
  between entities in one app; `persistence.namespace` is already specified
  as an idea-specific slug in `solution/skills/product-analyzer/SKILL.md:102`,
  so separate runs on the same `localhost:3000` origin don't bleed into each
  other. Schema already regex-validates the slug format.

Explicit non-goals — decided against, not deferred:

- No stored-record envelope, version field, or migration policy.
  `parameters.json` is fixed at build time per run; nothing ever migrates a
  persisted shape within a judged run.
- No relational/normalized storage. One flat array per entity,
  `{id, createdAt, ...fields}`.
- No conflict resolution beyond last-write-wins across tabs.
- No kernel-level `updatedAt`/audit trail — a normal field via
  `entities[].actions.sets` covers it if an idea needs one.

Gap closed: the cross-tab `storage`-event listener was wired but had zero
test coverage. Added in `app-template/src/data/repository.test.ts`: same-key
notify, unsubscribe stops it, `key: null` clear-all notifies, an unrelated
key doesn't, and one integration-level test proving `Repository.list()`
actually reflects another tab's write. 84 → 87 tests, all passing.

## Robustness (20 pts)

Rule: every error message in the app renders through the shared `Alert`
component (`app-template/src/ui/Alert.tsx`, danger/warning/ok/neutral tones)
— never hand-rolled markup.

Finding: `Alert` existed but was imported nowhere. Six sites duplicated the
same danger-styled banner by hand (`App.tsx`, `RecordForm.tsx`,
`ErrorBoundary.tsx`, `CollectionView.tsx`, `LandingPage.tsx`,
`PrototypeFlow.tsx`); the last two were still on the old `.notice-error`
CSS class, a leftover from before the utility-class migration
(`ce883eb`) that never got cleaned up in those two files.

Fix applied: all six sites now render `<Alert tone="danger" title="..." />`,
with the retry/dismiss buttons passed as `children` where one exists
(`ErrorBoundary`, `CollectionView`'s storage-error banner). `Alert` itself
now sets `role` from tone (`alert` for danger/warning, `status` for
ok/neutral) so no call site has to remember accessibility semantics.

Verified: `tsc --noEmit` clean, `vite build` clean, full suite 87/87 passing
(covers the `RecordForm` and `ErrorBoundary` alert paths), and a live
browser check of the validation-error banner (empty required field →
correct icon, tone, and copy).

Scope note: `LandingPage.tsx`/`PrototypeFlow.tsx` still carry the rest of
their legacy semantic-class markup (`.hero`, `.section`, `.card`, `.notice-ok`,
etc.) beyond the error banner — untouched here. Per
`solution/skills/product-analyzer/SKILL.md`, the analyzer always models an
idea as a real collection and never picks `kind: "landing"`/`"screen"`, so
these two views are reachable in the kernel but not currently selected by
the production skill flow for any judged idea. A full restyle of them is
deferred as low-priority/likely-unreachable, not silently dropped — flag if
the skill's routing ever changes to actually select these kinds.
