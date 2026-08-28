# Tailwind Plus catalog: Application Shells, Headings, Data Display, Lists

Backlog of real Tailwind Plus "Application UI" components, cataloged for future
dashboard features. For each subcategory below we only looked at the
**first/default example** (not the 15-20+ style variants each subcategory
typically offers) with the code-language selector set to **React**. This is a
research index only — no component code has been vendored yet. When we
actually build one of these, re-fetch the current source from Tailwind Plus
(don't copy from this file) and follow the vendoring steps in
`app-template/src/ui/blocks/README.md` (drop `dark:` variants, remap literal
Tailwind colors to this app's theme tokens, replace external asset URLs with
offline-safe alternatives).

Packages already installed in `app-template/package.json`: `@headlessui/react`,
`@heroicons/react`. "Needs nothing extra" below means the example uses only
those two (or neither) — no new dependency would be required to vendor it.

---

## Application Shells

### Stacked Layouts — "With bottom border"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/stacked
- **What it is**: A full page shell with a horizontal top navbar (nav links, notification bell, user avatar dropdown) and a collapsible mobile menu. Use as the outer chrome for a top-nav-style app instead of a sidebar.
- **Imports**: `@headlessui/react` (`Disclosure`, `DisclosureButton`, `DisclosurePanel`, `Menu`, `MenuButton`, `MenuItem`, `MenuItems`), `@heroicons/react/24/outline` (`Bars3Icon`, `BellIcon`, `XMarkIcon`). Needs nothing extra.
- **External assets to flag**: 1 Unsplash avatar URL (`user.imageUrl`, for the account dropdown) + 2 `tailwindcss.com/plus-assets/img/logos/mark.svg` logo URLs (light/dark mode mark). All three need swapping for an initials avatar / inline SVG mark before this app (offline) could use it.
- **Size / effort**: ~230 lines. Bigger vendor job — a full shell with mobile menu, notifications, and a dropdown, comparable in scope to the already-vendored `home-screen-sidebar` block.

### Sidebar Layouts — "Simple sidebar"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/sidebar
- **What it is**: A full page shell with a static desktop left sidebar (icon nav links + a "Teams" list using letter-initial badges) and an off-canvas mobile sidebar (Headless UI `Dialog`). This is the base shell that our existing `home-screen-sidebar` block builds its page content on top of, minus the content.
- **Imports**: `@headlessui/react` (`Dialog`, `DialogBackdrop`, `DialogPanel`, `TransitionChild`), `@heroicons/react/24/outline` (`Bars3Icon`, `CalendarIcon`, `ChartPieIcon`, `DocumentDuplicateIcon`, `FolderIcon`, `HomeIcon`, `UsersIcon`, `XMarkIcon`). Needs nothing extra.
- **External assets to flag**: 2 `tailwindcss.com/plus-assets/img/logos/mark.svg` logo URLs (light/dark). Team entries already use letter-initial badges (`initial: 'H'` etc.) — that part is already offline-safe, no avatar photos here.
- **Size / effort**: ~200+ lines. Bigger vendor job (mobile dialog + desktop nav + state), but a natural "alternate shell" option alongside `home-screen-sidebar`.

### Multi-Column Layouts — "Full-width three-column"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/application-shells/multi-column
- **What it is**: The same sidebar-shell pattern as "Sidebar Layouts" (identical nav/teams data and mobile `Dialog`), but the content region is split into a three-column layout — useful for a master list + detail + secondary panel dashboard arrangement.
- **Imports**: Same as Sidebar Layouts — `@headlessui/react` (`Dialog`, `DialogBackdrop`, `DialogPanel`, `TransitionChild`), `@heroicons/react/24/outline` nav icons. Needs nothing extra.
- **External assets to flag**: Same pattern as Sidebar Layouts — expect the 2 `plus-assets` logo SVGs in the header (not independently re-verified past the shared header markup, but the import list and structure are identical).
- **Size / effort**: Largest of the three shells (likely 300+ lines) — same shell chrome plus extra column scaffolding. Bigger vendor job.

---

## Headings

### Page Headings — "With actions"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/headings/page-headings
- **What it is**: A page-title row (`<h2>`) with "Edit"/"Publish" action buttons on the right, stacking responsively on mobile. Good generic top-of-page header for a detail screen.
- **Imports**: None — plain JSX, no headlessui/heroicons needed.
- **External assets to flag**: None.
- **Size / effort**: ~25 lines. Trivial/quick vendor job.

### Card Headings — "Simple"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/headings/card-headings
- **What it is**: A minimal card header bar (bottom border + bold title, e.g. "Job Postings") meant to sit above card/list content.
- **Imports**: None.
- **External assets to flag**: None.
- **Size / effort**: ~7 lines. Trivial — smallest block in this catalog.

### Section Headings — "Simple"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/headings/section-headings
- **What it is**: Same idea as Card Headings but for a full-width content section rather than a card (bottom-border title bar).
- **Imports**: None.
- **External assets to flag**: None.
- **Size / effort**: ~7 lines. Trivial.

---

## Data Display

### Description Lists — "Left-aligned"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/description-lists
- **What it is**: A key/value profile-style description list (`<dl>`/`<dt>`/`<dd>`) plus an "Attachments" sub-list with download links. Good fit for a record/detail view — e.g. a single deployment's metadata panel.
- **Imports**: `@heroicons/react/20/solid` (`PaperClipIcon` only). Needs nothing extra.
- **External assets to flag**: None — attachments are just filenames/sizes, no real files or images referenced.
- **Size / effort**: ~65 lines. Quick vendor job.

### Stats — "With trending"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/stats
- **What it is**: A 4-up KPI tile row (Revenue, Overdue invoices, Outstanding invoices, Expenses) with a small `+/-%` change indicator colored by direction. Directly usable as a dashboard summary strip.
- **Imports**: None — plain JSX with a small `classNames` helper, no headlessui/heroicons.
- **External assets to flag**: None.
- **Size / effort**: ~35 lines. Quick vendor job — **notably reusable as-is for a deployments/analytics dashboard's top KPI row** (swap the 4 stat labels for e.g. "Deployments today", "Failed builds", "Avg build time", "Active environments").

### Calendars — "Small with meetings"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/data-display/calendars
- **What it is**: A compact month-grid mini calendar (today/selected day styled via Tailwind v4 `data-*` attribute selectors) shown side-by-side with an "Upcoming meetings" list; each meeting row has a Headless UI dropdown ("..." menu).
- **Imports**: `@heroicons/react/20/solid` (`CalendarIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `EllipsisHorizontalIcon`, `MapPinIcon`), `@headlessui/react` (`Menu`, `MenuButton`, `MenuItem`, `MenuItems`). Needs nothing extra.
- **External assets to flag**: 5 Unsplash avatar photo URLs (one per meeting attendee) — need swap to initials avatars.
- **Size / effort**: ~220 lines (two data arrays + calendar grid logic + meeting list + dropdown menu). Bigger vendor job — most complex Tailwind (nested `data-*`/`not-data-*`/`in-data-*` selector combinators) of everything reviewed here.

---

## Lists

### Stacked Lists — "Simple"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/lists/stacked-lists
- **What it is**: A vertical divided list of people rows — avatar, name, email, role, and a "last seen" timestamp or an "Online" status dot. Classic "team members" list.
- **Imports**: None beyond React.
- **External assets to flag**: 6 Unsplash avatar photo URLs — need swap to initials avatars.
- **Size / effort**: ~65 lines. Quick vendor job apart from the avatar swap.

### Tables — "Simple"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/lists/tables
- **What it is**: A classic responsive data table ("Users": Name/Title/Email/Role columns) with a header-level "Add user" button and a per-row "Edit" link. Directly adaptable as a plain records/deployments table.
- **Imports**: None beyond React.
- **External assets to flag**: None at all.
- **Size / effort**: ~70 lines. Quick vendor job — **no offline-safety concerns whatsoever**, making it the easiest table-shaped block to vendor.

### Grid Lists — "Contact cards with small portraits"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/lists/grid-lists
- **What it is**: A responsive card grid of people/contacts — avatar, name, role badge, title, and an email/phone quick-action footer per card.
- **Imports**: `@heroicons/react/20/solid` (`EnvelopeIcon`, `PhoneIcon`). Needs nothing extra.
- **External assets to flag**: 6 Unsplash avatar photo URLs — need swap to initials avatars.
- **Size / effort**: ~100 lines. Moderate vendor job.

### Feeds — "Simple with icons"
- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/lists/feeds
- **What it is**: A vertical activity/timeline feed — connecting line between entries, an icon-in-circle per event, a description with an inline link, and a timestamp. Ideal shape for a deployment/build activity log.
- **Imports**: `@heroicons/react/20/solid` (`CheckIcon`, `HandThumbUpIcon`, `UserIcon`). Needs nothing extra.
- **External assets to flag**: None.
- **Size / effort**: ~90 lines. Quick vendor job — **notably reusable as-is for a deployments activity timeline** (swap the icons/labels for "Build started" / "Tests passed" / "Deployed to production" style events).

---

## Summary table

| Subcategory | Default example | Deps beyond React | External assets to swap | Size | Effort |
|---|---|---|---|---|---|
| Stacked Layouts | With bottom border | headlessui + heroicons | 1 Unsplash avatar, 2 plus-assets logos | ~230 lines | Bigger |
| Sidebar Layouts | Simple sidebar | headlessui + heroicons | 2 plus-assets logos | ~200+ lines | Bigger |
| Multi-Column Layouts | Full-width three-column | headlessui + heroicons | ~2 plus-assets logos (same pattern) | ~300+ lines | Bigger |
| Page Headings | With actions | none | none | ~25 lines | Quick |
| Card Headings | Simple | none | none | ~7 lines | Quick |
| Section Headings | Simple | none | none | ~7 lines | Quick |
| Description Lists | Left-aligned | heroicons | none | ~65 lines | Quick |
| Stats | With trending | none | none | ~35 lines | Quick |
| Calendars | Small with meetings | headlessui + heroicons | 5 Unsplash avatars | ~220 lines | Bigger |
| Stacked Lists | Simple | none | 6 Unsplash avatars | ~65 lines | Quick |
| Tables | Simple | none | none | ~70 lines | Quick |
| Grid Lists | Contact cards with small portraits | heroicons | 6 Unsplash avatars | ~100 lines | Moderate |
| Feeds | Simple with icons | heroicons | none | ~90 lines | Quick |
