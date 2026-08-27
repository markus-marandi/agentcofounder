<!-- DEV ONLY: delete before freeze. See docs/starter.md "Pre-freeze cleanup". -->

# Working on this harness

Context for coding agents (Claude Code, Codex) working **on the AgentCofounder
harness itself**. This file is not read by Pi: `buildPiArguments` in
`src/run-challenge.ts` passes `--no-context-files`, so only
`output/app/AGENTS.md` reaches the model at run time.

Read `MEMORY.md` for the decision log before proposing anything that reverses a
decision already taken.

## What this repo does

One Pi invocation turns a non-technical product idea into a working, tested
browser app at `http://localhost:3000`, plus an audited `result.json`. Our
strategy: **prebuild the software engineering so the model only makes product
decisions.** See `README.md` for the architecture.

## Ownership boundaries

| Area | Owner | Notes |
|---|---|---|
| `src/`, `contract-public/`, `docs/organizer-checklist.md` | Organizer | Change only with a clear reason; judged behaviour depends on it |
| `docs/starter.md` | Organizer | Verbatim relocation of the original README. Do not reword |
| `solution/` | Us | Prompt, skills, extensions |
| `app-template/` | Us | The seed copied into `output/app` every run |
| `output/`, `artifacts/`, `result.json` | Runner | Generated. Never hand-edit |

Team split during the hackathon:

- **Shared kernel (land first):** `app-template/src/{kernel,ui,data,themes}`,
  `styles.css`, `parameters.schema.json`, `solution/skills/product-analyzer/`,
  `solution/system-prompt.md`, `solution/extensions/verify-loop.ts`, CI.
- **Markus:** `solution/skills/web-app/`,
  `app-template/src/ui/{Chart,DashboardGrid}.tsx`, `app-template/src/{mock,auth}/`.

## Hard constraints (verified in code — do not relitigate)

1. **No network at run time.** `src/run-challenge.ts` sets `PI_OFFLINE=1` and
   `--offline`, and `docs/organizer-checklist.md` says the judge blocks
   outbound network. No search APIs, no CDNs, no `npx <remote-package>`.
2. **No new dependencies at agent time.** `app-template/AGENTS.md` and
   `solution/system-prompt.md` both forbid it. To add a dependency, add it to
   `app-template/package.json`, regenerate `app-template/package-lock.json` on
   **Node 22.19.x**, and run `npm run check`. Never regenerate a lockfile on
   Node 23+ — `npm ci` will then fail for the organizer.
3. **`.env` writes are blocked.** `solution/extensions/protected-paths.ts`
   rejects `.env` and `.env.*`. Fixtures belong in committed source files.
4. **Port 3000 is the runner's.** Nothing in `solution/` may leave a listener
   behind; `src/port-owner.ts` audits it and a stray listener degrades the run.
5. **The seed must always build green.** `npm run check` runs the seed's tests
   and production build. A seed that cannot build with zero model edits breaks CI.
6. **Domain neutrality.** Never encode the sample book-lending domain (or any
   single idea's vocabulary) into reusable code. Judging uses a different idea.
7. **Vitest strictness.** `src/verify-app.ts` requires at least one completed
   test and zero skipped or todo tests. Never commit `.skip` or `.todo`.

## Efficiency is scored

Ranking counts Pi's `usage.totalTokens`, which includes cache reads. Two
consequences:

- Every skill's `name` and `description` sits in the system prompt on **every**
  model call. Adding a skill is a permanent per-call cost. Justify each one.
- Work moved from model output into committed seed code is a direct win. Prefer
  extending a kernel primitive over prompting the model to write the same code.

## Conventions

- SKILL.md files follow https://agentskills.io/specification: `name` and
  `description` frontmatter, directory name matching `name`.
- Vendored skills keep their upstream `LICENSE.txt`; record them in
  `THIRD_PARTY_NOTICES.md`.
- `tools/dev-skills/` is for our editor only and is never passed to Pi.

## Before you finish

```bash
npm run check
```
