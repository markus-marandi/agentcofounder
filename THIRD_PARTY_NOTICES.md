# Third-party notices

## Agent Skills vendored from anthropics/skills

Source: https://github.com/anthropics/skills
Upstream commit: `0a64e398ec6bb34a494f0c347e8ccae53a862f8e`
Licence: Apache License 2.0 (per-skill `LICENSE.txt` retained verbatim)

| Path | Upstream skill | Loaded by Pi at run time |
|---|---|---|
| `tools/dev-skills/skill-creator/` | `skills/skill-creator` | No — development only |
| `tools/dev-skills/webapp-testing/` | `skills/webapp-testing` | No — development only |

Colour palettes in `app-template/src/themes/presets.css` are derived from the
`theme-factory` skill in the same repository and commit, also Apache 2.0. The
skill itself is not vendored; only its palette values are reused, restated as
CSS custom properties.

## Tailwind Plus

Source: https://tailwindcss.com/plus/ui-blocks/application-ui
Licence: Tailwind Plus (commercial) — used under the project owner's own
Tailwind Plus account licence, not open source. Markup is adapted, not
redistributed verbatim: theme tokens replace literal `indigo`/`gray` classes,
`dark:` variants are removed, and every external asset URL (Unsplash photos,
`tailwindcss.com` logo assets) is replaced with an offline-safe alternative.
See `app-template/src/ui/blocks/README.md` and `docs/tailwind-plus-catalog/`.

| Path | Block | Note |
|---|---|---|
| `app-template/src/ui/blocks/HomeScreenSidebar.tsx` | Page Examples → Home Screens → "Sidebar", plus Data Display → Stats "With trending", Lists → Feeds "Simple with icons", Lists → Tables "Simple", Overlays → Modal Dialogs "Centered with single action", Overlays → Notifications "Simple", Feedback → Alerts "With description", Navigation → Tabs "Tabs with underline", Navigation → Breadcrumbs "Contained", Navigation → Progress Bars "Simple", Elements → Dropdowns "Simple", Elements → Avatars "Avatar group stacked bottom to top" | Illustrative sample data, not wired to the repository |
| `app-template/src/ui/Alert.tsx` | Feedback → Alerts "With description" | Shared primitive |
| `app-template/src/ui/Breadcrumbs.tsx` | Navigation → Breadcrumbs "Contained" | Shared primitive |
| `app-template/src/ui/Dropdown.tsx` | Elements → Dropdowns "Simple" | Shared primitive |
| `app-template/src/ui/Tabs.tsx` | Navigation → Tabs "Tabs with underline" | Shared primitive |
| `app-template/src/ui/Card.tsx` | Layout → Cards "Basic card" | Shared primitive |
| `app-template/src/ui/Badge.tsx` | Elements → Badges "With border" | Shared primitive |
| `app-template/src/ui/Button.tsx` | Elements → Buttons "Primary buttons" | Shared primitive |
| `app-template/src/ui/ButtonGroup.tsx` | Elements → Button Groups "Basic" | Shared primitive |

Two MIT-licensed npm packages were added to `app-template/package.json` to
support this block's interactive/iconography needs: `@headlessui/react` and
`@heroicons/react`. Both are normal dependencies, not vendored code.

## Agent Skills specification

Skills authored in `solution/skills/` follow the open Agent Skills
specification published at https://agentskills.io/specification, which Pi
implements (see `node_modules/@earendil-works/pi-coding-agent/docs/skills.md`).
