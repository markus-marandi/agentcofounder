# Configure product — single compiled stage

The product idea and the structural seed below are the complete model context.
Do not inspect the repository. Make the product decisions once and write only
`candidate.json`. Mechanical generation and verification happen after this
stage.

## Output contract

Write one JSON object with exactly:

- `idea_spec.target_user`: a concrete non-empty string;
- `idea_spec.assumptions`: an array of concise non-empty strings, one decision
  per genuine ambiguity (use `[]` when none are needed);
- `parameters`: a complete replacement for the seed configuration.

After the write, answer only `done`. Do not create or modify another file.

## Product decisions

- Preserve the shipped shell, navigation, search, theme mode, CRUD surface,
  confirmation flows, and browser-local repository boundary.
- Keep `route` as `web-app`. Put the collection first, followed by at least
  three useful product-specific content entries with distinct `body` text.
- Declare every field implied by the idea. Field types are `text`, `longtext`,
  `number`, `date`, `select`, `combobox`, or `boolean`; use `combobox` when the
  idea gives open-ended examples.
- Make identifiers and every value the user explicitly wants to log required
  unless missingness is part of the described workflow.
- Include meaningful filters, derived values, title sorting, and paired
  state-changing actions with opposite `when` conditions whenever the idea
  describes a moment such as lend/return, complete/reopen, or pay/unpay.
- When an action needs an associated value, collect it in the action by setting
  `"prompt": "<fieldName>"`; clear that field in the opposite action. Do not
  make the user edit the record before performing the action.
- Every route has one persisted entity with create, edit, confirmed delete,
  search, refresh persistence, at least one filter, and at least one derived
  value. Do not drop an implied journey to simplify.
- State concrete browser-local limitations and use a product-specific
  lowercase-hyphenated localStorage namespace.
- Keep `components` consistent with the configured collection surface. Do not
  add authentication, network access, packages, a second search box, or new UI
  when the seed already expresses the idea.

The seed is valid and demonstrates the required object shapes. Rewrite its
product decisions; do not copy its generic nouns or placeholder content.
