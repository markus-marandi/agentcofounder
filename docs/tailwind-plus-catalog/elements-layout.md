# Tailwind Plus catalog — Elements & Layout

Cataloging pass over Tailwind Plus's Application UI &rarr; **Elements** and
**Layout** subcategories, as a backlog for future dashboard features. For
each subcategory we recorded only the **first/default example** shown on
the page (these subcategories have 5-16 style variants each — variants are
not cataloged here, just noted as "N components" from the site's index).

This is notes only, not vendored code. When we actually build one of these,
re-open the URL, switch the language selector to React, and copy the real
source — don't rely on the snippets paraphrased below.

Source index: https://tailwindcss.com/plus/ui-blocks/application-ui

Installed deps this app already has (see `app-template/package.json`):
`@headlessui/react` 2.2.10, `@heroicons/react` 2.2.0. "Extra deps needed"
below means beyond those two.

## Elements

| Subcategory | URL | What it is | Deps beyond headlessui/heroicons | External assets | Size / vendor effort |
|---|---|---|---|---|---|
| Avatars | https://tailwindcss.com/plus/ui-blocks/application-ui/elements/avatars | "Circular avatars" — a row of 5 circular `<img>` avatars at increasing sizes (`size-6` through `size-14`), rounded-full with a subtle outline ring. Use for a user/profile identity chip at various densities (nav bar, table row, header). | None | **Yes — flag.** All 5 `<img>` tags point to the same Unsplash photo URL (`images.unsplash.com/photo-1472099645785-...`). Confirms the task's assumption: Avatars examples are photo-based and will need the same swap this repo already did — replace with the initials-avatar helper (`Avatar` function in `app-template/src/ui/blocks/HomeScreenSidebar.tsx:46`, which renders initials on a `bg-accent-soft` circle) or an inline SVG placeholder. Note: this repo's `Avatar` helper only handles single circular avatars, no notification-dot or stacked-group variants — those Avatars variants (further down the page) would need extra adaptation. | ~26 lines JSX, all static markup, no props/state. Trivial vendor job once the photo URL is swapped for the initials helper. |
| Badges | https://tailwindcss.com/plus/ui-blocks/application-ui/elements/badges | "With border" — a row of 8 pill-shaped `<span>` badges in 8 different colors (gray/red/yellow/green/blue/indigo/purple/pink), each with a subtle inset ring border. Use for status tags, labels, categories (e.g. "Active", "Failed", "Pending" on a deployments list). | None | None found. Pure Tailwind utility classes and a "Badge" text placeholder. | ~26 lines JSX, static markup only, no imports. Trivial — literally copy-paste-and-relabel. |
| Dropdowns | https://tailwindcss.com/plus/ui-blocks/application-ui/elements/dropdowns | "Simple" — a `Menu`/`MenuButton`/`MenuItems` dropdown ("Options" button that opens a list: Account settings / Support / License / Sign out). Use for row-level or header action menus (e.g. a "..." menu per deployment). | `@headlessui/react` (`Menu`, `MenuButton`, `MenuItem`, `MenuItems`) + `@heroicons/react/20/solid` (`ChevronDownIcon`) — both already installed, nothing extra needed. | None. | ~50 lines JSX. Includes a `<form action="#" method="POST">` wrapping the Sign-out item and Headless UI transition data-attributes (`data-closed`, `data-enter`, etc.) — a bit more involved than the static Elements above, but still a straightforward single-file vendor job since both deps are already in package.json. |
| Buttons | https://tailwindcss.com/plus/ui-blocks/application-ui/elements/buttons | "Primary buttons" — 5 solid indigo `<button>` elements at 5 sizes (from a very small `xs`-ish button up to a large `px-3.5 py-2.5` button). Use as the base action button (Save, Deploy, Create) across the app. | None | None. | ~30 lines JSX, static, no imports. Trivial — a good candidate for extracting into a small shared `Button` component with a `size` prop rather than vendoring as one static block. |
| Button Groups | https://tailwindcss.com/plus/ui-blocks/application-ui/elements/button-groups | "Basic" — a segmented control of 3 buttons ("Years" / "Months" / "Days") joined into one pill-shaped group via negative margins and selective rounding. Use for view/period toggles (e.g. switching a chart's time range). | None | None. | ~24 lines JSX, static, no imports. Trivial. |

## Layout

| Subcategory | URL | What it is | Deps beyond headlessui/heroicons | External assets | Size / vendor effort |
|---|---|---|---|---|---|
| Containers | https://tailwindcss.com/plus/ui-blocks/application-ui/layout/containers | "Full-width on mobile, constrained with padded content above" — not really a "component," just a `<div className="mx-auto max-w-7xl sm:px-6 lg:px-8">` wrapper pattern. Use as the outer width/gutter wrapper for any page content area. | None | None. | 1 line JSX. Not really vendorable as a "block" — more of a class-pattern to reuse directly in layout code when a page needs the standard max-width gutter. |
| Cards | https://tailwindcss.com/plus/ui-blocks/application-ui/layout/cards | "Basic card" — a plain rounded, shadowed white box (`overflow-hidden rounded-lg bg-white shadow-sm`) with a padded content slot. Use as the base panel/card wrapper for any dashboard tile (stat cards, chart panels, list panels). | None | None. | ~5 lines JSX. Trivial — this is the kind of primitive that's worth having as a shared `<Card>` component rather than copy-pasted per feature. Very reusable for a deployments/analytics dashboard (every tile would start from this). |
| List containers | https://tailwindcss.com/plus/ui-blocks/application-ui/layout/list-containers | "Simple with dividers" — a `<ul role="list">` skeleton with `divide-y` between `<li>` rows, driven by an example `items` array. Use as the base wrapper for any vertical list of records (deployments, activity, users). | None | None. | ~13 lines JSX including sample data array. Trivial skeleton — content per `<li>` is left as `{/* Your content */}`, so this is more of a pattern than a finished component. |
| Media Objects | https://tailwindcss.com/plus/ui-blocks/application-ui/layout/media-objects | "Basic" — a `flex` row pairing a fixed-size media/icon slot (here an inline placeholder `<svg>` diagonal-cross box, not a real icon or photo) on the left with a heading + paragraph on the right. Use for comment rows, activity-feed entries, or a user-profile header (icon/avatar + name + description). | None | None — the placeholder graphic here is an **inline SVG** (a literal diagonal-line box used by Tailwind Plus as a generic "image goes here" placeholder), not a remote URL, so no swap is needed for this particular example. Worth noting other Media Objects variants (not cataloged) may use avatars/photos instead. | ~20 lines JSX, static, no imports. Trivial. |
| Dividers | https://tailwindcss.com/plus/ui-blocks/application-ui/layout/dividers | "With label" — a horizontal rule split by a centered label (e.g. "Continue"), built from two `border-t` divs flanking a centered `<span>`. Use to separate sections within a form or panel (e.g. "OR" between sign-in methods, or a labeled break between grouped settings). | None | None. | ~10 lines JSX, static, no imports. Trivial. |

## Summary of notable flags

- **Only Avatars is photo-based** among these 10 — every other subcategory's
  first example is either pure Tailwind utility markup or an inline SVG
  placeholder, so Avatars is the one that definitely needs the
  `Avatar`/initials-helper swap from `HomeScreenSidebar.tsx` before it could
  be vendored into this offline app, per
  `app-template/src/ui/blocks/README.md`.
- **Dropdowns is the only one needing real deps beyond static markup** —
  it needs `@headlessui/react` and `@heroicons/react`, both already
  installed for `home-screen-sidebar`, so no new `package.json` entries
  required.
- **Cards, Containers, and List containers are less "components" and more
  reusable class patterns/skeletons** — worth considering as small shared
  primitives (`<Card>`, a container class, a `<ul>` wrapper) rather than
  one-off vendored blocks, since a deployments/analytics dashboard will
  want many card-shaped panels and list rows built on exactly this base.
- **Badges, Buttons, and Button Groups** are all strong, low-effort
  candidates for an analytics/deployments dashboard: status badges for
  deploy state, primary buttons for actions like "Redeploy," and a
  button-group for time-range toggles on a chart.
- Nothing else in this batch referenced `tailwindcss.com/plus-assets/...`
  logo/image URLs — the only external asset found across all 10 was the
  repeated Unsplash avatar photo.
