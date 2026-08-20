import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionView } from "./CollectionView.js";
import { resetRepositories } from "../kernel/useRepository.js";
import type { EntitySpec } from "../kernel/types.js";

const entity: EntitySpec = {
  name: "kernelDemo",
  label: "Item",
  labelPlural: "Items",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "kind", label: "Kind", type: "select", options: ["A", "B"] },
    { name: "done", label: "Done", type: "boolean" },
  ],
  filters: [
    { field: "kind", label: "Kind", mode: "equals" },
    { field: "done", label: "Done only", mode: "truthy" },
  ],
  derived: [
    { id: "total", label: "Items", kind: "count" },
    { id: "open", label: "Open", kind: "countWhere", where: { field: "done", mode: "falsy" } },
  ],
};

/** Scoped to the add/edit panel, because the filter bar reuses the same field labels. */
function form() {
  return within(screen.getByRole("region", { name: /^(Add|Edit) a? ?item$/iu }));
}

async function addItem(user: ReturnType<typeof userEvent.setup>, title: string, kind?: string) {
  await user.type(form().getByLabelText(/Title/u), title);
  if (kind) await user.selectOptions(form().getByLabelText("Kind"), kind);
  await user.click(screen.getByRole("button", { name: /Add item/iu }));
}

beforeEach(() => {
  window.localStorage.clear();
  resetRepositories();
});

describe("collection view", () => {
  it("invites the first record when the collection is empty", () => {
    render(<CollectionView entity={entity} />);
    expect(screen.getByText(/No items yet/iu)).toBeInTheDocument();
  });

  it("adds a record and shows it in the collection", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);

    await addItem(user, "First item", "A");

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByLabelText("Items")).toHaveTextContent("1");
  });

  it("refuses to add a record with a missing required field", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);

    await user.click(screen.getByRole("button", { name: /Add item/iu }));

    expect(screen.getByText(/Title is required/u)).toBeInTheDocument();
    expect(screen.getByText(/No items yet/iu)).toBeInTheDocument();
  });

  it("edits an existing record", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addItem(user, "Before");

    await user.click(screen.getByRole("button", { name: "Edit Before" }));
    const title = form().getByLabelText(/Title/u);
    await user.clear(title);
    await user.type(title, "After");
    await user.click(screen.getByRole("button", { name: /Save item/iu }));

    expect(screen.getByText("After")).toBeInTheDocument();
    expect(screen.queryByText("Before")).not.toBeInTheDocument();
  });

  it("asks before removing and only removes once confirmed", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addItem(user, "Doomed");

    await user.click(screen.getByRole("button", { name: "Remove Doomed" }));
    expect(screen.getByText("Doomed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm removing Doomed" }));
    expect(screen.queryByText("Doomed")).not.toBeInTheDocument();
  });

  it("narrows the collection by a filter and updates the derived totals", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addItem(user, "Alpha", "A");
    await addItem(user, "Beta", "B");

    expect(screen.getByLabelText("Items")).toHaveTextContent("2");

    await user.selectOptions(screen.getByLabelText("Kind", { selector: "#filter-kind" }), "A");

    const list = screen.getByRole("list");
    expect(within(list).getByText("Alpha")).toBeInTheDocument();
    expect(within(list).queryByText("Beta")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Items")).toHaveTextContent("1");
  });

  it("offers a way back when a filter matches nothing", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addItem(user, "Alpha", "A");

    await user.click(screen.getByLabelText("Done only"));
    expect(screen.getByText(/Nothing matches/iu)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Clear filters/iu }));
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("finds records by a search term when search is enabled", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} searchEnabled />);
    await addItem(user, "Alpha");
    await addItem(user, "Beta");

    await user.type(screen.getByLabelText("Search"), "alph");

    const list = screen.getByRole("list");
    expect(within(list).getByText("Alpha")).toBeInTheDocument();
    expect(within(list).queryByText("Beta")).not.toBeInTheDocument();
  });

  it("keeps records across a remount, standing in for a page refresh", async () => {
    const user = userEvent.setup();
    const first = render(<CollectionView entity={entity} />);
    await addItem(user, "Persisted");
    first.unmount();

    resetRepositories();
    render(<CollectionView entity={entity} />);

    expect(screen.getByText("Persisted")).toBeInTheDocument();
  });
});
