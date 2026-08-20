<!-- DEV ONLY: delete before freeze. See docs/starter.md "Pre-freeze cleanup". -->

# Development-only skills

Copies of two skills from [anthropics/skills](https://github.com/anthropics/skills)
(Apache 2.0, upstream commit `0a64e398ec6bb34a494f0c347e8ccae53a862f8e` — see
`THIRD_PARTY_NOTICES.md`). They are for **our** editor while building the
harness. They are never passed to Pi, and `src/run-challenge.ts` does not
reference this directory.

| Skill | Why it is here | Why it is not loaded at run time |
|---|---|---|
| `skill-creator` | Evaluates how reliably a skill description triggers — the thing that decides whether the analyzer routes an idea correctly | Its value is in tuning our skills before a run, not during one |
| `webapp-testing` | Drives a real browser so we can look at each route ourselves | Needs Playwright and Python, neither in the lockfile, and it would tempt the model to hold port 3000 |

Use them from Claude Code by pointing your skills setting at this directory.
