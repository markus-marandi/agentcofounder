#!/usr/bin/env node
/**
 * Writes `src/journeys.generated.test.tsx` from `parameters.json`.
 *
 * Every journey the delivery floor asks for is a consequence of the
 * configuration: the fields decide what the add form contains, `actions`
 * decide which state changes are one click, `filters` and `derived` decide
 * what narrows and what counts. So the tests are derivable, and deriving them
 * costs no model output and cannot drift from the kernel's accessible names.
 *
 * The names asserted here are the kernel's published contract:
 *   region        "Add a <label>" / "Edit <label>"
 *   submit        "Add <label>" / "Save <label>"
 *   row action    "<Action label>: <title>"
 *   confirm       "Confirm <action label lowercased>: <title>"
 *   remove        "Remove <title>" then "Confirm removing <title>"
 *   filter        the filter's own label, on #filter-<field>
 *   derived       the derived label, on the <dd>
 * Change one of those in `src/ui/` and this generator changes with it.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const appRoot = process.cwd();
const TEST_PATH = path.join("src", "journeys.generated.test.tsx");

function lower(value) {
  return String(value ?? "").toLowerCase();
}

/** A deterministic value for a field, distinct per `n`. */
function sampleValue(field, n) {
  switch (field.type) {
    case "number":
      return String(n);
    case "date":
      return `2026-01-0${n}`;
    case "boolean":
      return n === 1;
    case "select":
    case "combobox": {
      const options = field.options ?? [];
      if (options.length >= n) return options[n - 1];
      if (options.length > 0) return options[(n - 1) % options.length];
      return `${field.label} ${n}`;
    }
    default:
      return `${field.label} ${n}`;
  }
}

/**
 * Fields a record always carries: everything required, plus the option-bearing
 * fields the filters need. Fields an action fills stay blank so the action that
 * fills them is still offered.
 */
function baseFields(entity) {
  const actionTargets = new Set();
  for (const action of entity.actions ?? []) {
    if (action.prompt) actionTargets.add(action.prompt);
    for (const name of Object.keys(action.sets ?? {})) actionTargets.add(name);
  }
  return entity.fields.filter(
    (field) =>
      !actionTargets.has(field.name) &&
      (field.required || field.type === "select" || field.type === "combobox"),
  );
}

/**
 * The action that fills `name` with something truthy — the one the create form
 * no longer offers, because setting it is the action's job. A fixture that
 * needs the field set has to reach it the way a person does: add the record,
 * then run the action.
 */
function actionFilling(entity, name, value) {
  return (entity.actions ?? []).find((action) => {
    if (action.prompt === name) return true;
    const written = (action.sets ?? {})[name];
    return value === undefined
      ? written !== undefined && written !== null && written !== false && written !== ""
      : written === value;
  });
}

function conditionMatches(value, condition) {
  switch (condition?.mode) {
    case "truthy":
      return Boolean(value);
    case "falsy":
      return !value;
    case "contains":
      return String(value ?? "").toLowerCase().includes(String(condition.value ?? "").toLowerCase());
    case "beforeToday":
      return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
        value < new Date().toISOString().slice(0, 10)
      );
    case "equals":
    default:
      return String(value ?? "") === String(condition?.value ?? "");
  }
}

function valueForCondition(entity, condition) {
  const field = fieldNamed(entity, condition.field);
  switch (condition.mode) {
    case "truthy":
      return field?.type === "boolean" ? true : sampleValue(field, 1);
    case "falsy":
      return field?.type === "boolean" ? false : "";
    case "contains":
    case "equals":
      return condition.value;
    case "beforeToday":
      return "2000-01-01";
    default:
      return sampleValue(field, 1);
  }
}

function actionSatisfying(entity, condition) {
  const wanted = valueForCondition(entity, condition);
  return (entity.actions ?? []).find((action) => {
    if (action.prompt === condition.field) return conditionMatches(wanted, condition);
    return conditionMatches((action.sets ?? {})[condition.field], condition);
  });
}

/**
 * The lines that put one record on screen in the state `values` describes.
 * Plain fields go through the add form; a field an action owns goes through
 * that action, prompt and confirmation included.
 */
function addRecordLines(entity, values) {
  const owned = actionOwnedFields(entity);
  const plain = {};
  const viaAction = {};
  for (const [name, value] of Object.entries(values)) {
    if (owned.has(name)) viaAction[name] = value;
    else plain[name] = value;
  }

  const lines = [`await addRecord(user, ${json(plain)});`];
  const title = titleValue(entity, plain, 1);
  const state = Object.fromEntries(
    entity.fields.map((field) => [field.name, field.type === "boolean" ? false : null]),
  );
  Object.assign(state, plain);
  const executing = new Set();

  const runAction = (action) => {
    if (executing.has(action.id)) {
      throw new Error(`Action prerequisite cycle while preparing ${action.label}`);
    }
    executing.add(action.id);
    try {
      if (action.when && !conditionMatches(state[action.when.field], action.when)) {
        const prerequisite = actionSatisfying(entity, action.when);
        if (!prerequisite) {
          throw new Error(
            `No action can satisfy ${action.label}'s ${action.when.field} ${action.when.mode} prerequisite`,
          );
        }
        runAction(prerequisite);
      }
      if (action.when && !conditionMatches(state[action.when.field], action.when)) {
        throw new Error(`Action ${action.label} is still unavailable after preparing its prerequisite`);
      }

      let prompt = "undefined";
      if (action.prompt) {
        const promptField = fieldNamed(entity, action.prompt);
        const promptValue = Object.hasOwn(viaAction, action.prompt)
          ? viaAction[action.prompt]
          : sampleValue(promptField, 1);
        prompt = json([action.prompt, String(promptValue)]);
        state[action.prompt] = promptValue;
      }
      lines.push(
        `await rowAction(user, ${json(action.label)}, ${json(title)}, ${prompt}, ${Boolean(action.confirm)});`,
      );
      Object.assign(state, action.sets ?? {});
    } finally {
      executing.delete(action.id);
    }
  };

  for (const [name, value] of Object.entries(viaAction)) {
    if (state[name] === value) continue;
    const action = actionFilling(entity, name, value);
    if (!action) throw new Error(`No action can prepare ${name}=${json(value)} for a generated journey`);
    runAction(action);
    if (state[name] !== value) {
      throw new Error(`Action ${action.label} did not prepare ${name}=${json(value)} for a generated journey`);
    }
  }
  return lines;
}

/** Mirrors src/data/operations.ts: the create form withholds what an action owns. */
function actionOwnedFields(entity) {
  const owned = new Set();
  for (const action of entity.actions ?? []) {
    if (action.prompt) owned.add(action.prompt);
    for (const name of Object.keys(action.sets ?? {})) owned.add(name);
  }
  for (const field of entity.fields) {
    if (field.required && field.type !== "boolean") owned.delete(field.name);
  }
  return owned;
}

function sampleRecord(entity, n, overrides = {}) {
  const values = {};
  for (const field of baseFields(entity)) values[field.name] = sampleValue(field, n);
  return { ...values, ...overrides };
}

function titleValue(entity, record, n) {
  const titleField = entity.titleField ?? entity.fields[0]?.name;
  return String(record[titleField] ?? sampleValue(fieldNamed(entity, titleField), n));
}

function fieldNamed(entity, name) {
  return entity.fields.find((field) => field.name === name);
}

/** A record shaped so `when` holds — that is, so the action is offered. */
function recordSatisfying(entity, when, n) {
  if (!when) return sampleRecord(entity, n);
  const field = fieldNamed(entity, when.field);
  if (!field) return sampleRecord(entity, n);
  const mode = when.mode ?? "equals";
  if (mode === "falsy") return sampleRecord(entity, n);
  if (mode === "truthy") return sampleRecord(entity, n, { [field.name]: sampleValue(field, n) });
  return sampleRecord(entity, n, { [field.name]: String(when.value ?? sampleValue(field, n)) });
}

function json(value) {
  return JSON.stringify(value);
}

function indent(lines, depth) {
  const pad = "  ".repeat(depth);
  return lines.map((line) => (line === "" ? "" : pad + line)).join("\n");
}

function journey(title, lines) {
  return { title, lines };
}

function buildJourneys(parameters, entity) {
  const label = lower(entity.label);
  const plural = lower(entity.labelPlural ?? `${entity.label}s`);
  const addRegion = `Add a ${label}`;
  const addButton = `Add ${label}`;
  const emptyTitle = `No ${plural} yet`;
  const searchEnabled = parameters.features?.search === true;
  const journeys = [];

  const first = sampleRecord(entity, 1);
  const second = sampleRecord(entity, 2);
  const firstTitle = titleValue(entity, first, 1);
  const secondTitle = titleValue(entity, second, 2);

  journeys.push(
    journey(`invites the first ${label} when the collection is empty`, [
      "render(<App />);",
      `expect(screen.getByText(${json(emptyTitle)})).toBeInTheDocument();`,
    ]),
  );

  const shown = Object.entries(first).filter(([name]) => {
    const field = fieldNamed(entity, name);
    return field && field.type !== "boolean";
  });
  journeys.push(
    journey(`adds a ${label} and sees it in the collection`, [
      "const user = userEvent.setup();",
      "render(<App />);",
      `await addRecord(user, ${json(first)});`,
      ...shown.map(([, value]) => `expect(table().getByText(${json(String(value))})).toBeInTheDocument();`),
    ]),
  );

  for (const field of entity.fields.filter((candidate) => candidate.required && candidate.type !== "boolean")) {
    const withoutField = { ...first };
    delete withoutField[field.name];
    journeys.push(
      journey(`refuses to add a ${label} with no ${lower(field.label)} and keeps the collection empty`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        `await addRecord(user, ${json(withoutField)});`,
        `expect(screen.getByText(${json(`${field.label} is required.`)})).toBeInTheDocument();`,
        `expect(screen.getByText(${json(emptyTitle)})).toBeInTheDocument();`,
      ]),
    );
  }

  const titleField = fieldNamed(entity, entity.titleField ?? entity.fields[0]?.name);
  if (titleField && ["text", "longtext"].includes(titleField.type)) {
    const renamed = `${titleField.label} renamed`;
    journeys.push(
      journey(`edits an existing ${label}`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        `await addRecord(user, ${json(first)});`,
        `await user.click(screen.getByRole("button", { name: ${json(`Edit ${firstTitle}`)} }));`,
        `await setValue(user, panel(${json(`Edit ${label}`)}), ${json(titleField.name)}, ${json(renamed)});`,
        `await user.click(screen.getByRole("button", { name: ${json(`Save ${label}`)} }));`,
        `expect(table().getByText(${json(renamed)})).toBeInTheDocument();`,
        `expect(table().queryByText(${json(firstTitle)})).not.toBeInTheDocument();`,
      ]),
    );
  }

  journeys.push(
    journey(`asks before removing a ${label} and only removes it once confirmed`, [
      "const user = userEvent.setup();",
      "render(<App />);",
      `await addRecord(user, ${json(first)});`,
      `expect(table().getByText(${json(firstTitle)})).toBeInTheDocument();`,
      `await user.click(screen.getByRole("button", { name: ${json(`Remove ${firstTitle}`)} }));`,
      "// The confirmation is a modal: while it is open it is the only thing in the accessibility tree.",
      'expect(screen.getByRole("dialog")).toBeInTheDocument();',
      `await user.click(screen.getByRole("button", { name: ${json(`Confirm removing ${firstTitle}`)} }));`,
      `expect(screen.getByText(${json(emptyTitle)})).toBeInTheDocument();`,
    ]),
  );

  for (const action of entity.actions ?? []) {
    const record = recordSatisfying(entity, action.when, 1);
    const title = titleValue(entity, record, 1);
    const lines = [
      "const user = userEvent.setup();",
      "render(<App />);",
      ...addRecordLines(entity, record),
      `await user.click(screen.getByRole("button", { name: ${json(`${action.label}: ${title}`)} }));`,
    ];

    const promptField = action.prompt ? fieldNamed(entity, action.prompt) : undefined;
    let promptValue;
    if (promptField) {
      promptValue = String(sampleValue(promptField, 1));
      lines.push(
        `await setValue(user, table(), ${json(promptField.name)}, ${json(promptValue)});`,
        `await user.click(screen.getByRole("button", { name: ${json(`Confirm ${lower(action.label)}: ${title}`)} }));`,
        `expect(table().getByText(${json(promptValue)})).toBeInTheDocument();`,
      );
    } else if (action.confirm) {
      lines.push(
        `await user.click(screen.getByRole("button", { name: ${json(`Confirm ${lower(action.label)}: ${title}`)} }));`,
      );
    }

    for (const [name, value] of Object.entries(action.sets ?? {})) {
      const target = fieldNamed(entity, name);
      if (!target) continue;
      if (value === "@today") {
        lines.push("expect(table().getByText(today())).toBeInTheDocument();");
      } else if (value === null) {
        const cleared = String(record[name] ?? "");
        if (cleared !== "") lines.push(`expect(table().queryByText(${json(cleared)})).not.toBeInTheDocument();`);
      } else if (typeof value === "string" && !value.startsWith("@")) {
        lines.push(`expect(table().getByText(${json(value)})).toBeInTheDocument();`);
      }
    }

    // An action whose `sets` rewrites the field its `when` reads must stop
    // being offered the moment it succeeds: a second click has nothing to do.
    const gates = action.when && Object.keys(action.sets ?? {}).includes(action.when.field);
    if (gates || (action.prompt && action.when?.field === action.prompt)) {
      lines.push(
        `expect(screen.queryByRole("button", { name: ${json(`${action.label}: ${title}`)} })).not.toBeInTheDocument();`,
      );
      const opposite = (entity.actions ?? []).find(
        (candidate) =>
          candidate.id !== action.id &&
          candidate.when?.field === action.when?.field &&
          candidate.when?.mode !== action.when?.mode,
      );
      if (opposite) {
        lines.push(
          `expect(screen.getByRole("button", { name: ${json(`${opposite.label}: ${title}`)} })).toBeInTheDocument();`,
        );
      }
    }

    journeys.push(journey(`${lower(action.label)}: applies the action to a ${label} in one click`, lines));
  }

  for (const filter of entity.filters ?? []) {
    const field = fieldNamed(entity, filter.field);
    if (!field) continue;
    const mode = filter.mode ?? "equals";

    if (mode === "truthy" || mode === "falsy" || mode === "beforeToday") {
      const filled = sampleRecord(entity, 1, {
        [field.name]: mode === "beforeToday" ? "2000-01-01" : sampleValue(field, 1),
      });
      const blank = sampleRecord(
        entity,
        2,
        mode === "beforeToday" ? { [field.name]: "2999-01-01" } : {},
      );
      const matching =
        mode === "falsy" ? titleValue(entity, blank, 2) : titleValue(entity, filled, 1);
      const excluded =
        mode === "falsy" ? titleValue(entity, filled, 1) : titleValue(entity, blank, 2);
      journeys.push(
        journey(`narrows the collection with the ${json(filter.label).slice(1, -1)} filter`, [
          "const user = userEvent.setup();",
          "render(<App />);",
          ...addRecordLines(entity, filled),
          ...addRecordLines(entity, blank),
          `await user.click(filterControl(${json(filter.label)}, ${json(field.name)}));`,
          `expect(table().getByText(${json(matching)})).toBeInTheDocument();`,
          `expect(table().queryByText(${json(excluded)})).not.toBeInTheDocument();`,
        ]),
      );
      continue;
    }

    const one = String(sampleValue(field, 1));
    const two = String(sampleValue(field, 2));
    if (one === two) continue; // A single-option select cannot demonstrate narrowing.
    const recordOne = sampleRecord(entity, 1, { [field.name]: one });
    const recordTwo = sampleRecord(entity, 2, { [field.name]: two });
    journeys.push(
      journey(`narrows the collection by ${lower(field.label)}`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        ...addRecordLines(entity, recordOne),
        ...addRecordLines(entity, recordTwo),
        `await user.selectOptions(filterControl(${json(filter.label)}, ${json(field.name)}), ${json(two)});`,
        `expect(table().getByText(${json(titleValue(entity, recordTwo, 2))})).toBeInTheDocument();`,
        `expect(table().queryByText(${json(titleValue(entity, recordOne, 1))})).not.toBeInTheDocument();`,
      ]),
    );
  }

  const combobox = entity.fields.find((field) => field.type === "combobox");
  if (combobox) {
    const invented = `Unlisted ${lower(combobox.label)}`;
    const inventedRecord = sampleRecord(entity, 1, { [combobox.name]: invented });
    journeys.push(
      journey(`accepts a ${lower(combobox.label)} nobody anticipated`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        `await addRecord(user, ${json(inventedRecord)});`,
        `expect(table().getByText(${json(invented)})).toBeInTheDocument();`,
      ]),
    );

    const established = String(sampleValue(combobox, 1));
    const restated = `  ${established.toLowerCase()} `;
    journeys.push(
      journey(`folds a new spelling of a ${lower(combobox.label)} into the one already in use`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        `await addRecord(user, ${json(sampleRecord(entity, 1, { [combobox.name]: established }))});`,
        `await addRecord(user, ${json(sampleRecord(entity, 2, { [combobox.name]: restated }))});`,
        `expect(table().getAllByText(${json(established)})).toHaveLength(2);`,
        `expect(table().queryByText(${json(restated.trim())})).not.toBeInTheDocument();`,
      ]),
    );
  }

  if (searchEnabled) {
    journeys.push(
      journey(`finds a ${label} by searching for it`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        `await addRecord(user, ${json(first)});`,
        `await addRecord(user, ${json(second)});`,
        `await user.type(screen.getByLabelText("Search"), ${json(secondTitle)});`,
        `expect(table().getByText(${json(secondTitle)})).toBeInTheDocument();`,
        `expect(table().queryByText(${json(firstTitle)})).not.toBeInTheDocument();`,
      ]),
    );
  }

  journeys.push(
    journey(`keeps ${plural} across a page refresh`, [
      "const user = userEvent.setup();",
      "const first = render(<App />);",
      `await addRecord(user, ${json(first)});`,
      "first.unmount();",
      "resetRepositories();",
      "render(<App />);",
      `expect(table().getByText(${json(firstTitle)})).toBeInTheDocument();`,
    ]),
  );

  for (const derived of entity.derived ?? []) {
    if (derived.kind === "count") {
      journeys.push(
        journey(`counts every ${label} in ${lower(derived.label)}`, [
          "const user = userEvent.setup();",
          "render(<App />);",
          `await addRecord(user, ${json(first)});`,
          `await addRecord(user, ${json(second)});`,
          `expect(stat(${json(derived.label)})).toHaveTextContent("2");`,
        ]),
      );
      continue;
    }

    if (derived.kind === "countWhere" && derived.where) {
      const field = fieldNamed(entity, derived.where.field);
      if (!field) continue;
      const mode = derived.where.mode ?? "equals";
      const filled = sampleRecord(entity, 1, { [field.name]: sampleValue(field, 1) });
      const blank = sampleRecord(entity, 2);
      if (mode !== "truthy" && mode !== "falsy") continue;
      journeys.push(
        journey(`${lower(derived.label)} counts only the ${plural} it describes`, [
          "const user = userEvent.setup();",
          "render(<App />);",
          ...addRecordLines(entity, filled),
          `await addRecord(user, ${json(blank)});`,
          `expect(stat(${json(derived.label)})).toHaveTextContent("1");`,
        ]),
      );
      continue;
    }

    journeys.push(
      journey(`shows ${lower(derived.label)} above the collection`, [
        "const user = userEvent.setup();",
        "render(<App />);",
        `await addRecord(user, ${json(first)});`,
        `expect(stat(${json(derived.label)})).toBeInTheDocument();`,
      ]),
    );
  }

  return journeys;
}

function renderTestFile(parameters, entity, journeys) {
  const label = lower(entity.label);
  const controls = {};
  for (const field of entity.fields) {
    const kind =
      field.type === "boolean"
        ? "boolean"
        : field.type === "select"
          ? "select"
          : field.type === "date" || field.type === "number"
            ? "typed"
            : "text";
    // A boolean always has a false/true value and its toggle label has no
    // required marker; other required fields render the visible asterisk.
    controls[field.name] = {
      label: field.required && field.type !== "boolean" ? `${field.label} *` : field.label,
      kind,
    };
  }

  const header = [
    "/*",
    " * Generated by tools/generate-journeys.mjs from parameters.json — do not edit by hand.",
    " * Regenerate with `npm run journeys`.",
    " *",
    " * One journey per capability the configuration declares, driven through the",
    " * real App so the assertions exercise the configured entity, actions,",
    " * filters, derived values and persistence exactly as a person would meet them.",
    " */",
    'import { beforeEach, describe, expect, it } from "vitest";',
    'import { fireEvent, render, screen, within } from "@testing-library/react";',
    'import userEvent from "@testing-library/user-event";',
    'import { App } from "./App.js";',
    'import { resetRepositories } from "./kernel/useRepository.js";',
    "",
    "type User = ReturnType<typeof userEvent.setup>;",
    "type Scope = ReturnType<typeof within>;",
    "type Draft = Record<string, string | boolean>;",
    "",
    `const controls: Record<string, { label: string; kind: "text" | "typed" | "select" | "boolean" }> = ${JSON.stringify(controls, null, 2)};`,
    "",
    "function panel(name: string): Scope {",
    '  return within(screen.getByRole("region", { name }));',
    "}",
    "",
    "function table(): Scope {",
    '  return within(screen.getByRole("table"));',
    "}",
    "",
    "/** A derived value renders as the <dd> its <dt> label names. */",
    "function stat(label: string): HTMLElement {",
    '  return screen.getByLabelText(label, { selector: "dd" });',
    "}",
    "",
    "/** A filter label can repeat a field label, so address the filter by its own id. */",
    "function filterControl(label: string, field: string): HTMLElement {",
    '  return screen.getByLabelText(label, { selector: "#filter-" + field });',
    "}",
    "",
    "function today(): string {",
    "  return new Date().toISOString().slice(0, 10);",
    "}",
    "",
    "async function setValue(user: User, scope: Scope, name: string, value: string | boolean): Promise<void> {",
    "  const control = controls[name];",
    "  const input = scope.getByLabelText(control.label);",
    '  if (control.kind === "boolean") {',
    "    if (value) await user.click(input);",
    "    return;",
    "  }",
    '  if (control.kind === "select") {',
    "    await user.selectOptions(input, String(value));",
    "    return;",
    "  }",
    '  if (control.kind === "typed") {',
    "    // jsdom date and number inputs do not accept synthetic keystrokes.",
    "    fireEvent.change(input, { target: { value: String(value) } });",
    "    return;",
    "  }",
    "  await user.clear(input);",
    "  await user.type(input, String(value));",
    "}",
    "",
    "/** One row action, including its inline prompt or its confirmation dialog. */",
    "async function rowAction(",
    "  user: User,",
    "  label: string,",
    "  title: string,",
    "  prompt?: [string, string],",
    "  confirm = false,",
    "): Promise<void> {",
    '  await user.click(screen.getByRole("button", { name: label + ": " + title }));',
    "  if (prompt) await setValue(user, table(), prompt[0], prompt[1]);",
    "  if (prompt || confirm) {",
    '    await user.click(screen.getByRole("button", { name: "Confirm " + label.toLowerCase() + ": " + title }));',
    "  }",
    "}",
    "",
    "async function addRecord(user: User, values: Draft): Promise<void> {",
    "  for (const [name, value] of Object.entries(values)) {",
    `    await setValue(user, panel(${json(`Add a ${label}`)}), name, value);`,
    "  }",
    `  await user.click(screen.getByRole("button", { name: ${json(`Add ${label}`)} }));`,
    "}",
    "",
    "beforeEach(() => {",
    "  window.localStorage.clear();",
    "  resetRepositories();",
    "});",
    "",
    `describe(${json(`${parameters.product?.name ?? entity.label} journeys`)}, () => {`,
  ];

  const body = journeys.map(
    (item) => `  it(${json(item.title)}, async () => {\n${indent(item.lines, 2)}\n  });`,
  );

  return [...header, body.join("\n\n"), "});", ""].join("\n");
}

async function main() {
  const parameters = JSON.parse(await readFile(path.join(appRoot, "parameters.json"), "utf8"));
  const entity = parameters.entities?.[0];
  if (!entity) throw new Error("parameters.json declares no entity to build journeys from");

  const journeys = buildJourneys(parameters, entity);
  await writeFile(path.join(appRoot, TEST_PATH), renderTestFile(parameters, entity, journeys), "utf8");
  console.log(`Wrote ${TEST_PATH}: ${journeys.length} journeys for "${entity.name}".`);
}

await main();
