# Fixtures

Two hand-written ideas for the web-app route: `web-app.txt` is a broader
stress test (extra field, extra filter, a date field), and `skeleton.txt` is a
tight mirror of the confirmed public test shape — one entity, four
attributes, one filter, one derived value, refresh persistence, single user,
with the same kind of category ambiguity as the public prompt.

```bash
npm run challenge -- --idea-file docs/fixtures/web-app.txt
npm run score
```

### Ambiguity batch

`ambiguity-01-books.txt` through `ambiguity-11-theater-props.txt` are 11
domain reskins of `skeleton.txt`'s shape — a personal lend/return collection,
same 4 attributes (title/name, creator/maker, a `roughly what kind, like A
or B or C` combobox category, and a borrower name set/cleared by an action),
filtered on the derived "currently out" status, single user. Only the
noun and the borrow context change per file. Use them to check the skill
resolves the combobox ambiguity the same way regardless of domain wording.

These are development inputs, not judging material. The official idea will be
different, so never tune a skill to the specific words below.

The single-stage ICM + Markus-main integration has a committed reviewer index
for qualified runs across both hand-written fixtures and all 11 ambiguity
reskins: [`../icm-markus-integration-evidence.md`](../icm-markus-integration-evidence.md).
Generated results and raw telemetry remain runner-owned artifacts rather than
committed fixtures.
