import { beforeEach, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./App.js";
import { defaultEntity, parameters } from "./kernel/config.js";
import type { FieldSpec } from "./kernel/types.js";

beforeEach(() => {
  window.localStorage.clear();
});

async function openCollection(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  const collection = parameters.navigation.find((entry) => entry.kind === "collection");
  if (!collection) throw new Error("The generated configuration has no collection navigation entry");
  if (parameters.navigation[0]?.kind === "showcase") {
    await user.click(screen.getByRole("button", { name: collection.label }));
  }
}

async function fillField(user: ReturnType<typeof userEvent.setup>, field: FieldSpec, title: string): Promise<void> {
  const control = screen.getAllByLabelText(field.label, { exact: false })[0]!;
  if (field.type === "boolean") {
    await user.click(control);
    return;
  }
  if (field.type === "select") {
    await user.selectOptions(control, field.options?.[0] ?? "");
    return;
  }
  const value = field.name === defaultEntity().titleField
    ? title
    : field.type === "number"
      ? String(field.min ?? 1)
      : field.type === "date"
        ? "2020-01-01"
        : `Sample ${field.label}`;
  await user.type(control, value);
}

it("delivers the active generated configuration through the real application", async () => {
  const user = userEvent.setup();
  const entity = defaultEntity();
  const addName = `Add ${entity.label.toLowerCase()}`;
  const firstTitle = "Verified generated record";
  const updatedTitle = "Updated generated record";

  const view = render(<App />);
  await openCollection(user);
  await user.click(screen.getByRole("button", { name: addName }));
  expect(screen.getByRole("alert")).toHaveTextContent(/field.*attention/iu);

  for (const field of entity.fields) await fillField(user, field, firstTitle);
  await user.click(screen.getByRole("button", { name: addName }));
  expect(screen.getByText(firstTitle)).toBeInTheDocument();

  for (const filter of entity.filters ?? []) expect(screen.getAllByLabelText(filter.label).length).toBeGreaterThan(0);
  for (const derived of entity.derived ?? []) expect(screen.getAllByText(derived.label).length).toBeGreaterThan(0);
  for (const limitation of parameters.features.limitations ?? []) expect(screen.getByText(limitation)).toBeInTheDocument();

  view.unmount();
  render(<App />);
  await openCollection(user);
  expect(screen.getByText(firstTitle)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: `Edit ${firstTitle}` }));
  const titleControl = screen.getAllByLabelText(
    entity.fields.find((field) => field.name === entity.titleField)!.label,
    { exact: false },
  )[0]!;
  await user.clear(titleControl);
  await user.type(titleControl, updatedTitle);
  await user.click(screen.getByRole("button", { name: `Save ${entity.label.toLowerCase()}` }));
  expect(screen.getByText(updatedTitle)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: `Remove ${updatedTitle}` }));
  await user.click(screen.getByRole("button", { name: `Confirm removing ${updatedTitle}` }));
  expect(screen.queryByText(updatedTitle)).not.toBeInTheDocument();
});
