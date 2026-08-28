# Tailwind Plus catalog: Feedback, Navigation, Overlays

Cataloging pass over Tailwind Plus "Application UI" for three groups, one
canonical (first/default) example per subcategory. This is a backlog
reference only — no code has been vendored. When we actually build one of
these, re-fetch the real source from Tailwind Plus (do not copy from this
file) and follow the vendoring steps in
`app-template/src/ui/blocks/README.md`.

Stack context: `app-template/package.json` already has `@headlessui/react`
(2.2.10) and `@heroicons/react` (2.2.0) as dependencies — nothing else. Any
import outside those two is called out explicitly below (none were found;
every example in this pass only needs headlessui/heroicons or nothing extra).

Legend for "Size / effort": **Quick** = small, self-contained, no external
assets to replace. **Medium** = bigger and/or has an external asset
(logo/photo) that must be swapped before this could run offline.

---

## Feedback

### Alerts

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/alerts
- **Default example**: "With description" (1 of 6 variants)
- **What it is**: A colored inline banner — icon, bold heading, body text —
  for a non-blocking contextual notice inside a page (e.g. a warning above a
  form or list). Not a toast, doesn't float or auto-dismiss.
- **Imports**: `ExclamationTriangleIcon` from `@heroicons/react/20/solid`.
  No headlessui. Nothing beyond the two installed packages.
- **External assets**: none.
- **Size / effort**: ~20 lines JSX. Quick.
- **Overlap with existing code**: `app-template/src/ui/ErrorBoundary.tsx`
  already hand-rolls a similar danger-colored alert box for caught render
  errors, using this app's theme tokens (`border-danger`, `bg-danger-soft`).
  Alerts wouldn't replace that — ErrorBoundary is a very specific
  catch-and-recover mechanism. Alerts would be useful for the cases
  ErrorBoundary doesn't cover: inline info/warning/success banners that
  aren't tied to a JS exception (e.g. "this deployment is using a deprecated
  runtime").

### Empty States

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/feedback/empty-states
- **Default example**: "Simple" (1 of 6 variants)
- **What it is**: Centered icon + heading + description + CTA button, shown
  when a list/table/collection has no data yet (e.g. "No projects — create
  one").
- **Imports**: `PlusIcon` from `@heroicons/react/20/solid`, plus one inline
  `<svg>` icon (hand-drawn path, not an image file). No headlessui.
- **External assets**: none — the icon is inline SVG.
- **Size / effort**: ~33 lines JSX. Quick.
- **Overlap with existing code**: `app-template/src/ui/EmptyState.tsx`
  already exists and covers the bare-bones case — a dashed-border box with
  `title`/`description`/`action` props, using theme tokens, no icon. The
  Tailwind Plus "Simple" and "With dashed border" variants are essentially a
  **restyle** of what's already there (mainly adding an icon). The richer
  variants — "With starting points", "With recommendations", "With
  templates", "With recommendations grid" — are materially new capability
  (multi-card/multi-option pickers for a first-run experience), not a
  restyle of `EmptyState.tsx`; they'd be new components if ever needed.

---

## Navigation

### Navbars

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/navbars
- **Default example**: "Simple dark with menu button on left" (1 of 11 variants)
- **What it is**: Full top app-bar: logo, horizontal nav links, mobile
  hamburger disclosure, a notification bell button, and a profile dropdown
  menu. This is the primary header shell candidate for a dashboard.
- **Imports**: `Disclosure, DisclosureButton, DisclosurePanel, Menu,
  MenuButton, MenuItem, MenuItems` from `@headlessui/react`; `Bars3Icon,
  BellIcon, XMarkIcon` from `@heroicons/react/24/outline`.
- **External assets — FLAGGED**:
  - Logo: `https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500`
  - Profile avatar (Unsplash): `https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?...`
- **Size / effort**: ~130-150 lines JSX (mobile disclosure panel repeats the
  nav item list). Medium — both external assets need swapping (logo → inline
  SVG/brand mark, avatar → initials).

### Pagination

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/pagination
- **Default example**: "Card footer with page buttons" (1 of 3 variants)
- **What it is**: A table/list footer — "Showing 1 to 10 of 97 results" plus
  Previous/Next and numbered page links. Good fit for paging a deployments
  or activity-log table.
- **Imports**: `ChevronLeftIcon, ChevronRightIcon` from
  `@heroicons/react/20/solid`. No headlessui.
- **External assets**: none.
- **Size / effort**: ~55-60 lines JSX. Quick.

### Tabs

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/tabs
- **Default example**: "Tabs with underline" (1 of 9 variants)
- **What it is**: Horizontal underlined tab bar (with a native `<select>`
  fallback for mobile) for switching between sub-views of a page, e.g.
  Overview / Activity / Settings on a deployment detail page.
- **Imports**: `ChevronDownIcon` from `@heroicons/react/16/solid` (used only
  for the mobile `<select>` affordance). No headlessui — this variant is
  plain anchors + a native select, not a Headless UI `TabGroup`.
- **External assets**: none.
- **Size / effort**: ~55 lines JSX. Quick.

### Vertical Navigation

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/vertical-navigation
- **Default example**: "Simple" (1 of 6 variants)
- **What it is**: A bare vertical list of nav links (no icons), meant to sit
  inside a sidebar's `<nav>`; the current item gets a highlighted
  background/text color.
- **Imports**: none — no headlessui, no heroicons, no other packages.
- **External assets**: none.
- **Size / effort**: ~30 lines JSX. Quick — the simplest item in this catalog.

### Sidebar Navigation

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/sidebar-navigation
- **Default example**: "Light" (1 of 5 variants)
- **What it is**: A full sidebar panel — logo, icon+label nav items with
  count badges (5, 12, 20+), and a "Your teams" section using initials
  avatars. This is the fuller building block behind a sidebar app shell.
- **Imports**: `CalendarIcon, ChartPieIcon, DocumentDuplicateIcon,
  FolderIcon, HomeIcon, UsersIcon` from `@heroicons/react/24/outline`. No
  headlessui in the default snippet itself (it's the static desktop panel;
  a full page example would add a mobile off-canvas `Dialog`/`Transition`
  on top of this).
- **External assets — FLAGGED**: two logo variants for light/dark swap —
  `https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600`
  and `...&shade=500`. Team avatars are plain text initials in a colored
  circle, not images — safe as-is.
- **Size / effort**: ~110-130 lines JSX. Medium — swap the two logo assets.
- **Note**: this overlaps conceptually with
  `app-template/src/ui/blocks/HomeScreenSidebar.tsx`, already vendored from
  *Application UI → Page Examples → Home Screens → "Sidebar"* (see
  `app-template/src/ui/blocks/README.md`). Check that file before vendoring
  this one — they may be similar enough that we don't need both.

### Breadcrumbs

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/breadcrumbs
- **Default example**: "Contained" (1 of 4 variants)
- **What it is**: A boxed breadcrumb trail — home icon, chevron separators,
  page names — for showing drill-down location, e.g. Deployments > Project
  Nero.
- **Imports**: `HomeIcon` from `@heroicons/react/20/solid`. No headlessui.
- **External assets**: none.
- **Size / effort**: ~45 lines JSX. Quick.

### Progress Bars

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/progress-bars
- **Default example**: "Simple" (1 of 8 variants)
- **What it is**: A horizontal step tracker (Step 1/2/3 with
  complete/current/upcoming states) for multi-step flows — a deploy wizard
  or onboarding flow, for example.
- **Imports**: none — no icons, no headlessui.
- **External assets**: none.
- **Size / effort**: ~50 lines JSX. Quick.

### Command Palettes

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/navigation/command-palettes
- **Default example**: "Simple" (1 of 8 variants)
- **What it is**: A ⌘K-style modal search/combobox for jumping to
  people/records/actions. Good candidate for a global "go to
  project/deployment" quick switcher.
- **Imports**: `Combobox, ComboboxInput, ComboboxOption, ComboboxOptions,
  Dialog, DialogPanel, DialogBackdrop` from `@headlessui/react`;
  `MagnifyingGlassIcon` from `@heroicons/react/20/solid`.
- **External assets**: none in the component code (the mountain photo
  visible behind the live preview on the Tailwind Plus page is their own
  demo-page chrome, not part of the vendored snippet).
- **Size / effort**: ~90-110 lines JSX. Medium — mainly because it's a
  meatier headlessui composition (Dialog + Combobox together) and ships a
  `'use client'` directive at the top (harmless/no-op outside Next.js, but
  worth stripping on vendor).

---

## Overlays

### Modal Dialogs

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/modal-dialogs
- **Default example**: "Centered with single action" (1 of 6 variants)
- **What it is**: A centered confirmation/success modal — icon, title, body
  text, one action button. E.g. "Payment successful" in the stock example;
  for us, something like "Deployment succeeded" or a destructive-action
  confirm dialog.
- **Imports**: `Dialog, DialogBackdrop, DialogPanel, DialogTitle` from
  `@headlessui/react`; `CheckIcon` from `@heroicons/react/24/outline`.
- **External assets**: none.
- **Size / effort**: ~65-70 lines JSX. Quick.

### Drawers

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/drawers
- **Default example**: "Empty" (1 of 12 variants)
- **What it is**: A right-side slide-over panel shell — title bar with a
  close button and an empty content area below. A skeleton for a "record
  details" or "add resource" side panel.
- **Imports**: `Dialog, DialogPanel, DialogTitle` from `@headlessui/react`;
  `XMarkIcon` from `@heroicons/react/24/outline`.
- **External assets**: none.
- **Size / effort**: ~55 lines JSX. Quick.

### Notifications

- **URL**: https://tailwindcss.com/plus/ui-blocks/application-ui/overlays/notifications
- **Default example**: "Simple" (1 of 6 variants)
- **What it is**: A single toast — icon, title, body, dismiss button —
  rendered in a fixed corner live region. For transient feedback after an
  action, e.g. "Deployment triggered".
- **Imports**: `Transition` from `@headlessui/react`; `CheckCircleIcon` from
  `@heroicons/react/24/outline`, `XMarkIcon` from `@heroicons/react/20/solid`.
- **External assets**: none.
- **Size / effort**: ~60 lines JSX. Quick.

---

## Summary for a deployments/analytics dashboard

Most reusable, roughly in priority order:

1. **Notifications** ("Simple" toast) and **Modal Dialogs** ("Centered with
   single action") — both quick, zero external assets, and directly useful
   for deploy-triggered/deploy-succeeded feedback and destructive-action
   confirmations.
2. **Command Palettes** — a ⌘K quick-switcher is a natural fit once there's
   more than a handful of projects/deployments to jump between. Medium
   effort but no external assets.
3. **Tabs**, **Breadcrumbs**, **Pagination**, **Progress Bars** — all quick,
   asset-free, and cover bread-and-butter dashboard chrome (sub-view
   switching, drill-down location, table paging, multi-step flows like a
   deploy wizard).
4. **Drawers** ("Empty") — a good generic side-panel skeleton for record
   detail views without leaving the current page.
5. **Navbars** and **Sidebar Navigation** are the two "shell" pieces and the
   only ones needing real asset work (logo + avatar swaps). Sidebar
   Navigation specifically should be compared against the already-vendored
   `HomeScreenSidebar.tsx` before duplicating effort.
6. **Alerts** and **Empty States** are lowest priority to vendor as new
   files since `ErrorBoundary.tsx` and `EmptyState.tsx` already cover the
   baseline case in this app; only worth revisiting if a richer empty-state
   variant (starting points / recommendations) becomes a real need.

No subcategory in this pass required any package beyond the two already
installed (`@headlessui/react`, `@heroicons/react`).
