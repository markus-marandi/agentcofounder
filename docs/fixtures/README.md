# Route fixtures

Five hand-written ideas, one per build route, plus a deliberately vague one.
They exercise the analyzer's classification and check that every route still
meets the delivery floor.

```bash
npm run challenge -- --idea-file docs/fixtures/web-app.txt
npm run score
```

Expected routes: `web-app.txt` → `web-app`, `dashboard.txt` → `mock-dashboard`,
`landing.txt` → `landing-page`, `prototype.txt` → `prototype`,
`vague.txt` → `open-build`.

These are development inputs, not judging material. The official idea will be
different, so never tune a skill to the specific words below.
