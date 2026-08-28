# Showcase blocks

Full-page templates vendored from Tailwind Plus, one file per block. A
`navigation` entry with `kind: "showcase"` renders whichever ids
`parameters.json`'s `showcase.blocks` array lists, via [`registry.ts`](registry.ts).
This is the activation surface described in `parameters.schema.json`: the
model turns a block on or off by adding or removing its id, never by editing
these files.

A block owns its entire page — header, nav, content — so it renders instead
of `AppShell`, not inside it (see the `kind === "showcase"` branch in
`../../App.tsx`).

## Adding a block

1. Vendor the block's React code under a paid Tailwind Plus account into a
   new `<Name>.tsx` here.
2. Adapt it: drop `dark:` variants (this app has no dark mode), replace
   literal `indigo`/`gray` Tailwind classes with this app's theme tokens
   (`text-ink`, `text-accent`, `bg-surface-sunk`, `border-line`, etc. — see
   `src/styles.css`) so the block follows `parameters.theme.preset`, and
   remove any external image/asset URL (Unsplash photos, `tailwindcss.com`
   logo assets) — this app runs offline, so a remote URL just renders broken.
   Use initials avatars or an inline SVG instead.
3. Add its id to `ShowcaseBlockId` in `src/kernel/types.ts`, the `showcase`
   enum in `parameters.schema.json`, and the map in `registry.ts`.
4. If the block needs a new npm dependency (Headless UI, Heroicons — both
   already added for `home-screen-sidebar`), add it to `package.json`,
   regenerate `package-lock.json` on Node 22.19.x, and record it in
   `THIRD_PARTY_NOTICES.md`.

## Blocks

| id | Source | Notes |
|---|---|---|
| `home-screen-sidebar` | [Home Screens, "Sidebar"](https://tailwindcss.com/plus/ui-blocks/application-ui/page-examples/home-screens) plus Stats, Feeds, Tables, Modal Dialogs, Notifications, Alerts, Tabs, Breadcrumbs, Progress Bars, Dropdowns, and Avatars — see `docs/tailwind-plus-catalog/` for each one's exact variant | All illustrative sample data, not wired to the repository yet |

Alert/Badge/Breadcrumbs/Button/ButtonGroup/Card/Dropdown/Tabs are generic
enough that they live as shared primitives in `../` (one level up) rather
than in this directory — this block imports them like anything else in `ui/`.
