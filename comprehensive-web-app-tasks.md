# Comprehensive Web App Tasks

Status: planning only. This document does not implement application code.

Target branch: `feat/markus-comprehensive-web-app`

## Goal

Turn `app-template` into a reusable comprehensive web-app shell where the model
only edits `parameters.json`. The seed owns the engineering: authentication,
navigation, settings, users, IAM, persistence, search, documentation, tests, and
the build/start workflow.

The runtime flow should be:

1. The model converts the product idea into `parameters.json`.
2. The schema validator checks references, capabilities, roles, and policies.
3. The prebuilt kernel assembles the application from that configuration.
4. The build pipeline generates API documentation and runs contract tests.
5. The runner exposes the result at `http://localhost:3000`.

The model must not need to write React, TypeScript, CSS, tests, or hand-written
API documentation for the comprehensive-web-app route.

## Existing Baseline

| Area | Present implementation | Gap to close |
|---|---|---|
| Assembly | `parameters.json` is loaded by `src/kernel/config.ts`; navigation count picks shell layout | Expand the contract without making the model write code |
| CRUD | `CollectionView` provides create, edit, delete, filters, derived values, and empty states | Apply capability checks to every action |
| Authentication | `src/auth/mockAuth.ts` provides a local `AuthProvider` | Add a provider context, auth gate, and a stable integration boundary |
| Mock users | `src/auth/seed-users.ts` contains fixed `admin` and `user` users | Make user definitions configurable and deterministic |
| IAM | Role labels are displayed by `AuthBar` | Add an explicit permission matrix and enforced authorization |
| Search | `src/data/searchIndex.ts` performs local case-insensitive substring search | Add a provider boundary, indexing rules, and permission-aware/global search |
| Storage | `Repository` -> `StorageAdapter` -> browser `localStorage` | Keep local persistence while documenting the future database adapter |
| Shell | Product header and config-driven navigation exist | Add comprehensive menu sections, settings, users, mobile behavior, and access states |
| Styling | Semantic classes and theme presets in `src/styles.css` | Extend the existing design system without adding a CSS dependency |
| API docs | `API.md` is manually maintained | Generate docs and an API manifest from validated parameters |
| Verification | Seed tests, build, and runner-owned dev-server checks exist | Add generic contract coverage so config-only generation remains safe |

## Non-Negotiable Constraints

- `parameters.json` is the only application artifact the model should edit for this route.
- No runtime network access, CDN, hosted authentication, server database, or search service.
- No new dependencies or install commands during an agent run.
- The runner owns port `3000`; the model must not leave a development server running.
- All records go through `src/data/repository.ts`; components never access browser storage directly.
- Unknown roles, permissions, routes, entities, and policy references fail closed and produce actionable validation errors.
- Mock authentication must always be labelled as demonstration authentication. It must never claim to provide security.
- The seed must pass `npm run check` with the default `parameters.json` before and after every phase.
- Tests must contain at least one completed test and no skipped or todo tests.

## Styling Decision

Superseded (`ce883eb`): the seed now runs on Tailwind CSS (`@tailwindcss/vite`),
styled on Tailwind Plus's Application UI patterns. The model still never writes
Tailwind classes — the kernel components that use it are prebuilt and committed,
restyled once, in committed code, not per run. The rules that still apply:

- Keep `src/styles.css` and `src/themes/presets.css` as the single place theme
  presets are bridged into Tailwind's theme tokens; the model edits neither.
- Keep all layout rules mobile-first with explicit narrow and wide viewport tests.
- No new runtime dependency beyond `@tailwindcss/vite` without a separate
  architecture decision; the model still adds zero dependencies at agent time.

### Fancy dashboard from Tailwind Plus blocks

Source: https://tailwindcss.com/plus/ui-blocks/application-ui/page-examples/home-screens

- [x] Pull markup from the Application UI "Home screens" page examples (logged
  in to Tailwind Plus) as the basis for a showcase page — done for the
  "Sidebar" example (`app-template/src/ui/blocks/HomeScreenSidebar.tsx`).
- [x] Vendor the block markup into the kernel's committed components — the
  model still only ever edits `parameters.json`; it never fetches or pastes
  Tailwind Plus markup itself. Implemented as a new `navigation[].kind:
  "showcase"` plus `parameters.showcase.blocks[]` (an id array), resolved
  through `app-template/src/ui/blocks/registry.ts` — this is the activation
  surface, documented in `app-template/src/ui/blocks/README.md`.
- [ ] Gate finer-grained *sections within* a block (stats row, activity feed,
  table) individually, not just whole blocks on/off. Not done — the first
  block is one unit; revisit once a second, more modular block exists.
- [x] Audited `app-template/src/ui/*` before adding new ones — see
  `app-template/COMPONENTS.md`. The showcase block is a full page (its own
  nav/header), so it replaces `AppShell` for that route rather than reusing
  `DashboardGrid`; it doesn't touch the existing 10 audited components.
- [ ] The block's deployments/activity content is illustrative sample data,
  same convention as `DashboardGrid`'s mock plots — not wired to
  `useRepository`/`entities` yet. Next real step before this is more than a
  visual spike.
- [ ] Catalog of the other ~45 Application UI subcategories (one canonical
  example each, not all 400+ style variants — confirmed that scope with
  Markus after finding the real count) is running as background research
  agents into `docs/tailwind-plus-catalog/*.md`. That catalog is the backlog
  for the next blocks to vendor, with the same adaptation pass every time
  (theme tokens instead of literal `indigo`/`gray`, no `dark:`, offline-safe
  assets, cross-navigation wired) — not a bulk unreviewed dump.

### Adopt Tailwind's official color palette

Source: https://tailwindcss.com/docs/colors

- [ ] Replace the hand-picked hex values in `src/themes/presets.css` (10
  presets: `modern-minimalist`, `arctic-frost`, `tech-innovation`,
  `ocean-depths`, `forest-canopy`, `botanical-garden`, `golden-hour`,
  `sunset-boulevard`, `desert-rose`, `midnight-galaxy`) with Tailwind's named
  palette scale (slate/gray/zinc/blue/emerald/etc., picking a shade step per
  role: `ink`, `ink-soft`, `surface`, `surface-sunk`, `line`, `accent`,
  `accent-soft`) instead of arbitrary hex.
  `--danger`/`--danger-soft` (used across `CollectionView`, `ErrorBoundary`,
  `RecordForm`) live in `src/styles.css`, not `presets.css` — bring those in
  scope too (Tailwind's `red` scale).
- [ ] Keep each preset visually distinct after the swap; don't let two presets
  collapse onto the same palette because the nearest named shade collides.
- [ ] Screenshot all 10 presets before/after to confirm no regression.

## Proposed Parameters Contract

The existing `features.auth` boolean remains the canonical switch. When it is
exactly `true`, authentication and the auth gate are always mounted. When it is
false or omitted, the app remains usable without a login and authorization is
not used to block the anonymous session.

Add optional configuration for the reusable system modules. The exact property
names should be finalized during the schema phase, but the shape should be
equivalent to:

```jsonc
{
  "features": {
    "search": true,
    "auth": true,
    "settings": true,
    "userManagement": true,
    "limitations": [
      "Authentication is a local demonstration only.",
      "Data is stored in this browser only."
    ]
  },
  "iam": {
    "users": [
      {
        "id": "admin",
        "name": "Ada Admin",
        "email": "admin@example.test",
        "role": "admin"
      },
      {
        "id": "user",
        "name": "Sam User",
        "email": "user@example.test",
        "role": "user"
      }
    ],
    "roles": [
      { "id": "admin", "label": "Administrator" },
      { "id": "user", "label": "User" }
    ],
    "policies": [
      { "resource": "entity:record", "action": "read", "roles": ["admin", "user"] },
      { "resource": "entity:record", "action": "create", "roles": ["admin", "user"] },
      { "resource": "entity:record", "action": "update", "roles": ["admin"] },
      { "resource": "entity:record", "action": "delete", "roles": ["admin"] },
      { "resource": "navigation:settings", "action": "view", "roles": ["admin", "user"] },
      { "resource": "navigation:users", "action": "view", "roles": ["admin"] }
    ]
  }
}
```

Schema validation must enforce:

- Unique navigation, entity, field, role, user, policy, and permission identifiers.
- Every user references a declared role.
- Every entity policy references a declared entity.
- Every navigation policy references a declared navigation entry or system entry.
- Every policy action is from a small documented set: `view`, `read`, `create`, `update`, `delete`, and `manage`.
- Policy role lists contain only declared roles.
- `features.auth: true` has at least one valid mock user and one valid role.
- Settings and user-management entries cannot be exposed without their corresponding feature.

The analyzer and route skill must write this contract, but must not write source
files. Unsupported product behavior should be recorded as a limitation rather
than triggering ad hoc component generation.

## Work Breakdown

### 1. Lock the LLM-only assembly boundary - P0

- [ ] Decide and document the exact model-owned file set: `parameters.json` only for the comprehensive route.
- [ ] Move API documentation generation, generic tests, and report metadata out of model-authored work where possible.
- [ ] Update `solution/system-prompt.md` so the model configures the seed instead of writing application code.
- [ ] Update `solution/skills/product-analyzer/SKILL.md` to produce the expanded parameter contract.
- [ ] Update `solution/skills/web-app/SKILL.md` to configure the comprehensive modules and never add components for normal needs.
- [ ] Make the build command validate parameters before compiling.
- [ ] Ensure the runner starts the built app on port `3000` after the model has settled; the model only needs to run validation/build checks.
- [ ] Record unsupported requirements in `features.limitations` and surface them in the UI.

Acceptance criteria:

- A clean app can be regenerated by changing only `app-template/parameters.json`.
- No model-authored `.tsx`, `.ts`, `.css`, test, or manual `API.md` file is required for the route.
- Invalid configuration fails before Vite compilation with specific field paths.

### 2. Expand the configuration and kernel - P0

- [ ] Extend `parameters.schema.json` with system-module feature flags and the IAM/user/policy contract.
- [ ] Extend `src/kernel/types.ts` with typed feature, user, role, and policy definitions.
- [ ] Extend `validateParameters` with duplicate and cross-reference validation.
- [ ] Keep the current `features.auth` boolean compatible with the default seed configuration.
- [ ] Add normalized accessors such as `entityByName`, `navigationById`, and `policyFor` so components do not parse raw JSON.
- [ ] Define a single default behavior for missing optional system configuration.
- [ ] Ensure all generated labels, descriptions, entity fields, filters, and navigation text originate from parameters.

Acceptance criteria:

- The default parameters file remains valid and builds without manual changes.
- A malformed role, user, entity reference, or policy is reported at build time.
- No component needs to know the shape of raw JSON beyond typed kernel accessors.

### 3. Authentication module - P0

The repository already contains a small dependency-free mock module in
`app-template/src/auth/`. The task is to promote it into the stable auth seam,
not to fetch a hosted auth provider at runtime.

- [ ] Keep or vendor the authentication source under `app-template/src/auth/` before the offline freeze.
- [ ] If any upstream source is used, commit its license and add it to `THIRD_PARTY_NOTICES.md`.
- [ ] Keep `AuthProvider` as the replaceable interface for `current`, `listUsers`, `signIn`, `signOut`, and `subscribe`.
- [ ] Add an auth context/hook so the app shell, pages, and action guards use one session source.
- [ ] Mount the auth provider whenever `features.auth === true`, with no route-specific opt-out.
- [ ] Show a clear signed-out auth gate instead of rendering protected data first.
- [ ] Keep the existing demo role switch, but label it `Demo authentication` or equivalent.
- [ ] Persist only a non-secret user ID in namespaced browser storage.
- [ ] Clear the session on sign out and recover safely when storage is unavailable or malformed.
- [ ] Never add passwords, tokens, OAuth credentials, or `.env` fixtures.

Acceptance criteria:

- `features.auth: true` always shows the auth flow before protected content.
- `features.auth: false` renders the app without a login control or auth gate.
- Signing in, refreshing/remounting, signing out, and selecting an unknown user behave deterministically.
- The UI clearly states that mock auth is not security or multi-user authentication.

### 4. Mock user generation and user directory - P0

- [ ] Retain `admin` and `user` as safe default users in `src/auth/seed-users.ts`.
- [ ] Allow `parameters.json` to override user display data and add deterministic demonstration users.
- [ ] Validate stable IDs, unique emails, and role references before build.
- [ ] Keep generated users free of passwords and secrets.
- [ ] Separate static seed users from any future persisted user directory; do not silently treat local records as real accounts.
- [ ] Add a config-driven Users page showing name, email, role label, and current-session state.
- [ ] Restrict user-management actions to an explicit IAM policy rather than checking `role === "admin"` in a component.
- [ ] Decide whether the hackathon scope is read-only user directory or local demo CRUD. If CRUD is selected, persist it in a dedicated namespaced collection and define what happens when the current user is removed or demoted.

Recommended hackathon scope: read-only directory plus role switching. This
demonstrates users and IAM without pretending that browser-local user records
are an account system.

Acceptance criteria:

- The default app always has deterministic `admin` and `user` users when auth is enabled.
- A generated user with an unknown role cannot make the app build.
- Users are never presented as real authenticated accounts.

### 5. Predefined IAM and enforced authorization - P0

Role labels alone are insufficient. Implement a small, explicit RBAC kernel
that can be configured without source changes.

- [ ] Add stable resource/action concepts for navigation, entities, settings, and user management.
- [ ] Implement a pure `authorize(session, resource, action, parameters)` function.
- [ ] Provide a capability helper such as `can("entity:record", "update")` through the auth context.
- [ ] Fail closed for signed-out users when auth is enabled.
- [ ] Hide or disable unauthorized navigation entries and prevent direct navigation to them.
- [ ] Gate create, read, update, and delete controls in `CollectionView`.
- [ ] Enforce the same checks in the application service/repository command path so hidden buttons are not the only protection.
- [ ] Return a consistent accessible `Access denied` state without throwing or mutating data.
- [ ] Render an admin-visible permission matrix or capability summary so the configured policy is inspectable.
- [ ] Define a documented default policy. Do not infer ownership or per-record access unless an explicit owner field and policy exist.
- [ ] Include an explicit limitation that browser-local RBAC is interface behavior, not server-side security.

Minimum policy tests:

- [ ] Admin can see and perform every policy granted to admin.
- [ ] User can see only the navigation and actions granted to user.
- [ ] Signed-out users cannot read or mutate protected data when auth is enabled.
- [ ] Unknown roles and unknown actions are denied.
- [ ] A denied create, update, or delete leaves repository state unchanged.
- [ ] Direct selection of a denied menu item cannot bypass the guard.

### 6. Comprehensive menu, settings, and shell - P0

- [ ] Extend navigation to represent ordinary entity pages and built-in `settings` and `users` pages without hard-coded product names.
- [ ] Keep menu layout derived from navigation count; the model should not choose a layout manually.
- [ ] Add an accessible mobile menu/drawer for larger navigation sets while preserving keyboard navigation and focus visibility.
- [ ] Add a Settings page driven by the configuration, including current product metadata, appearance/density preferences, storage namespace information, and limitation disclosures.
- [ ] Decide which settings are editable at runtime. Runtime preferences may be persisted locally; `parameters.json` remains build-time configuration and is not edited by the browser.
- [ ] Add a current-user summary and sign-out action to the shell when auth is enabled.
- [ ] Add loading, empty, denied, and recoverable-error states for every system page.
- [ ] Preserve the existing error boundary around each independently navigable view.

Acceptance criteria:

- A configuration with multiple entities plus settings/users produces a usable menu on narrow and wide screens.
- A configuration with one entry still produces the intended single-view shell.
- Unauthorized system pages are absent or show a deliberate denied state, never a blank page.

### 7. Local database boundary - P0

There is intentionally no server database for the offline hackathon. The local
repository is the database implementation; its interface is the integration
point for a future backend.

- [ ] Keep `Repository` and `StorageAdapter` as the only data access boundary.
- [ ] Add a small application data facade if needed so UI actions and IAM checks are composed before repository calls.
- [ ] Namespace record collections and auth/session data to avoid collisions between generated apps.
- [ ] Preserve localStorage persistence, corrupt-data recovery, duplicate-ID handling, and storage-write error reporting.
- [ ] Define the stored record envelope and version/migration policy before changing persisted shapes.
- [ ] Do not add Supabase, a hosted database, IndexedDB, or a server process in the first implementation unless the offline constraints are explicitly changed.
- [ ] Document a future `StorageAdapter` for HTTP/SQL/D1/etc. without shipping or invoking it at runtime.

Acceptance criteria:

- Create, edit, delete, refresh/remount, malformed storage, and blocked storage are covered by tests.
- No UI file imports `localStorage`, `Storage`, or an adapter directly.
- A future server adapter can replace the local adapter without changing view components.

### 8. Search engine boundary - P0

- [ ] Keep the current local substring implementation as the offline provider.
- [ ] Define a `SearchProvider` interface with query, entity scope, field scope, and result metadata.
- [ ] Index only configured searchable fields and normalize case consistently.
- [ ] Rebuild or update the index whenever repository data changes; never serve stale results after create, update, or delete.
- [ ] Filter search results through IAM before rendering them.
- [ ] Add a global search surface when more than one entity is configured; retain entity-level search for collection pages.
- [ ] Provide no-results, empty-query, malformed-query, and storage-error states.
- [ ] Keep an optional future server/search adapter documented but never fetched or called in offline mode.

Acceptance criteria:

- Search is case-insensitive, deterministic, and works across all declared text-bearing fields.
- Search results update after CRUD operations and do not expose unauthorized entities or records.
- The app remains fully usable with no network and with search disabled.

### 9. Automatically documented and exposed APIs - P0

"Exposed API" must be defined carefully because this app has no backend server
under the judging constraints.

- [ ] Add a typed local application facade for records, auth/session, IAM capabilities, settings, and search.
- [ ] Keep the facade backed by `Repository`, `AuthProvider`, and `SearchProvider`; components should consume the facade or typed hooks, not storage primitives.
- [ ] Add a build-time generator that reads validated `parameters.json` and writes `API.md`.
- [ ] Generate a machine-readable API manifest, such as `api-manifest.json`, alongside the markdown documentation.
- [ ] Generate docs for entities, fields, validation, filters, derived values, CRUD operations, auth behavior, IAM policies, search, persistence, and limitations.
- [ ] Make generated docs deterministic and avoid timestamps or random IDs.
- [ ] Run documentation generation automatically before build, or make build fail when the checked-in/generated docs are stale.
- [ ] State explicitly in the generated docs that there are no HTTP endpoints and no data leaves the browser.
- [ ] Document the adapter contract required to expose the same operations through a future server API.

Acceptance criteria:

- Changing only `parameters.json` changes the generated API docs and manifest.
- `API.md` is never dependent on a model remembering to update it manually.
- The docs do not claim that local mock auth or browser-local storage provides production security.

### 10. Contract tests and verification - P0

The seed should test behavior from configuration so the model does not need to
author test files for each generated app.

- [ ] Add schema/config tests for valid defaults, invalid references, duplicate IDs, and auth-enabled requirements.
- [ ] Add auth tests for gate behavior, session persistence, sign out, unknown users, and unavailable storage.
- [ ] Add IAM unit tests for allow, deny, signed-out, unknown-role, and unknown-action cases.
- [ ] Add UI tests for menu filtering, settings, users, access denied, and current-user state.
- [ ] Keep generic CRUD tests for every configured entity: create, required validation, edit, delete confirmation, filters, derived values, and remount persistence.
- [ ] Add search tests for entity scope, global scope, updates after mutation, no results, and permission filtering.
- [ ] Add generated-doc tests for stable output and entity/policy coverage.
- [ ] Add responsive/accessibility checks for labels, roles, focus states, keyboard menu use, and narrow layouts.
- [ ] Keep tests observable through accessible names and user interactions, not CSS selectors or implementation details.
- [ ] Ensure no test is `.skip` or `.todo`.
- [ ] Run `npm run check`, then the challenge/runner verification, and confirm port `3000` is clean afterward.

## Suggested Implementation Order

1. Freeze the parameter contract and model-owned file boundary.
2. Expand schema, types, validation, and default parameters.
3. Extract auth context and the unconditional `features.auth` gate.
4. Add configurable mock users and the read-only user directory.
5. Implement the pure IAM policy evaluator and enforce it in navigation and data actions.
6. Add settings and comprehensive shell states, including mobile navigation.
7. Formalize the local database and search provider boundaries.
8. Add the local application facade, API manifest, and generated `API.md`.
9. Add configuration-driven contract tests and update the runner prompts/skills.
10. Run the full check and a clean config-only generation rehearsal.

## Explicit Non-Goals For The Hackathon

- Production authentication, password handling, OAuth, SSO, JWTs, or security claims.
- A hosted or server-side database.
- A hosted or remote search engine.
- HTTP endpoints that imply data is available outside the browser.
- Any new runtime/build dependency beyond the adopted Tailwind toolchain, without a separate decision.
- Arbitrary bespoke product workflows that cannot be represented by the parameter contract.
- Per-record ownership enforcement without an explicit owner field and policy model.

## Definition Of Done

- [ ] A clean config-only run produces a comprehensive web app with entity pages, menu, settings, users, and limitations.
- [ ] `features.auth: true` always enables the demo auth gate and session UI.
- [ ] Default `admin` and `user` mock users are present and deterministic.
- [ ] IAM policies are visible, validated, and enforced for navigation and CRUD actions.
- [ ] Search and persistence work offline through replaceable local interfaces.
- [ ] `API.md` and the machine-readable API manifest are generated from parameters.
- [ ] The model did not need to write application source, tests, CSS, or manual docs.
- [ ] The app passes all contract tests, production build, startup probe, and clean shutdown checks.
- [ ] `npm run check` is green on the feature branch.
