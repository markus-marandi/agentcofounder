import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionView } from "./CollectionView.js";
import { resetRepositories } from "../kernel/useRepository.js";
import type { EntitySpec } from "../kernel/types.js";
import { createRepository, type StorageAdapter } from "../data/repository.js";

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

    const table = screen.getByRole("table");
    expect(within(table).getByText("Alpha")).toBeInTheDocument();
    expect(within(table).queryByText("Beta")).not.toBeInTheDocument();
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

    const table = screen.getByRole("table");
    expect(within(table).getByText("Alpha")).toBeInTheDocument();
    expect(within(table).queryByText("Beta")).not.toBeInTheDocument();
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

  it("confirms a destructive import and reports success only after it is persisted", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addItem(user, "Existing");
    const file = new File(["ignored"], "items.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: async () =>
        JSON.stringify({
          format: "agent-cofounder-app/export",
          version: 1,
          exportedAt: "2026-01-01T00:00:00.000Z",
          collections: {
            kernelDemo: [{ id: "imported", createdAt: "2026-01-01T00:00:00.000Z", title: "Imported" }],
          },
        }),
    });

    await user.upload(screen.getByLabelText("Import JSON"), file);

    expect(screen.getByText("Existing")).toBeInTheDocument();
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm replacing all items" }));

    expect(await screen.findByText("Imported")).toBeInTheDocument();
    expect(screen.queryByText("Existing")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Imported 1 item/u);
  });

  it("shows a read failure instead of silently presenting an empty collection", async () => {
    const blocked: StorageAdapter = {
      read: () => {
        throw new Error("blocked");
      },
      write: () => {},
    };
    const repository = createRepository("kernelDemo", blocked);

    render(<CollectionView entity={entity} repositoryOverride={repository} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/Saved data could not be loaded/u);
  });

  it("rejects an import that does not contain this collection without replacing data", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addItem(user, "Existing");
    const file = new File(["ignored"], "other.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: async () =>
        JSON.stringify({
          format: "agent-cofounder-app/export",
          version: 1,
          exportedAt: "2026-01-01T00:00:00.000Z",
          collections: { anotherEntity: [] },
        }),
    });

    await user.upload(screen.getByLabelText("Import JSON"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(/does not contain the items collection/u);
    expect(screen.getByText("Existing")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows one user-safe error and restores data when an import cannot be stored", async () => {
    const user = userEvent.setup();
    const existing = [{ id: "kept", createdAt: "2026-01-01T00:00:00.000Z", title: "Existing" }];
    const failing: StorageAdapter = {
      read: () => existing,
      write: async () => {
        throw new Error("private adapter detail");
      },
    };
    const repository = createRepository("kernelDemo", failing);
    render(<CollectionView entity={entity} repositoryOverride={repository} />);
    const file = new File(["ignored"], "items.json", { type: "application/json" });
    Object.defineProperty(file, "text", {
      value: async () =>
        JSON.stringify({
          format: "agent-cofounder-app/export",
          version: 1,
          exportedAt: "2026-01-01T00:00:00.000Z",
          collections: {
            kernelDemo: [{ id: "new", createdAt: "2026-01-01T00:00:00.000Z", title: "Imported" }],
          },
        }),
    });

    await user.upload(screen.getByLabelText("Import JSON"), file);
    await user.click(screen.getByRole("button", { name: "Confirm replacing all items" }));

    const alerts = await screen.findAllByRole("alert");
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toHaveTextContent(/Changes could not be saved/u);
    expect(alerts[0]).not.toHaveTextContent(/private adapter detail/u);
    expect(screen.getByText("Existing")).toBeInTheDocument();
    expect(screen.queryByText("Imported")).not.toBeInTheDocument();
  });
});
