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

## Agent Skills specification

Skills authored in `solution/skills/` follow the open Agent Skills
specification published at https://agentskills.io/specification, which Pi
implements (see `node_modules/@earendil-works/pi-coding-agent/docs/skills.md`).
