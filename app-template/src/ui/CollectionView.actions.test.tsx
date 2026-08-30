import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionView } from "./CollectionView.js";
import { resetRepositories } from "../kernel/useRepository.js";
import type { EntitySpec } from "../kernel/types.js";

/**
 * The lending shape: a record that goes out to someone and comes back. It is
 * the verb a plain edit form expresses badly, so it is the one the kernel has
 * to cover without a line of generated code.
 */
const entity: EntitySpec = {
  name: "actionDemo",
  label: "Book",
  labelPlural: "Books",
  titleField: "title",
  fields: [
    { name: "title", label: "Title", type: "text", required: true },
    { name: "kind", label: "Kind", type: "combobox", options: ["Novel", "Cookbook"] },
    { name: "borrower", label: "Borrower", type: "text" },
    { name: "lentOn", label: "Lent on", type: "date" },
  ],
  filters: [
    { field: "kind", label: "Kind", mode: "equals" },
    { field: "borrower", label: "Out on loan only", mode: "truthy" },
  ],
  derived: [
    { id: "total", label: "Books", kind: "count" },
    { id: "out", label: "On loan", kind: "countWhere", where: { field: "borrower", mode: "truthy" } },
  ],
  actions: [
    {
      id: "lend",
      label: "Lend",
      prompt: "borrower",
      sets: { lentOn: "@today" },
      when: { field: "borrower", mode: "falsy" },
      style: "primary",
    },
    {
      id: "return",
      label: "Mark returned",
      sets: { borrower: null, lentOn: null },
      when: { field: "borrower", mode: "truthy" },
    },
  ],
  sort: { field: "title", direction: "asc" },
};

function form() {
  return within(screen.getByRole("region", { name: /^(Add|Edit) a? ?book$/iu }));
}

async function addBook(user: ReturnType<typeof userEvent.setup>, title: string, kind?: string) {
  await user.type(form().getByLabelText(/Title/u), title);
  if (kind) await user.type(form().getByLabelText("Kind"), kind);
  await user.click(screen.getByRole("button", { name: /Add book/iu }));
}

beforeEach(() => {
  window.localStorage.clear();
  resetRepositories();
});

describe("row actions", () => {
  it("collects a value inline and writes it to the record", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Hamlet");

    await user.click(screen.getByRole("button", { name: "Lend: Hamlet" }));
    const table = within(screen.getByRole("table"));
    await user.type(table.getByLabelText("Borrower"), "Ada");
    await user.click(screen.getByRole("button", { name: "Confirm lend: Hamlet" }));

    expect(screen.getByRole("table")).toHaveTextContent("Ada");
    expect(screen.getByLabelText("On loan")).toHaveTextContent("1");
  });

  it("swaps which action is offered once the record changes state", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Hamlet");

    expect(screen.queryByRole("button", { name: "Mark returned: Hamlet" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lend: Hamlet" }));
    await user.type(within(screen.getByRole("table")).getByLabelText("Borrower"), "Ada");
    await user.click(screen.getByRole("button", { name: "Confirm lend: Hamlet" }));

    expect(screen.queryByRole("button", { name: "Lend: Hamlet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark returned: Hamlet" })).toBeInTheDocument();
  });

  it("clears the record in one click and survives being clicked again", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Hamlet");
    await user.click(screen.getByRole("button", { name: "Lend: Hamlet" }));
    await user.type(within(screen.getByRole("table")).getByLabelText("Borrower"), "Ada");
    await user.click(screen.getByRole("button", { name: "Confirm lend: Hamlet" }));

    await user.click(screen.getByRole("button", { name: "Mark returned: Hamlet" }));

    expect(screen.getByRole("table")).not.toHaveTextContent("Ada");
    expect(screen.getByLabelText("On loan")).toHaveTextContent("0");
    // The button is gone rather than merely harmless, so there is no second click to make.
    expect(screen.queryByRole("button", { name: "Mark returned: Hamlet" })).not.toBeInTheDocument();
  });

  it("judges the prompted value by the same rules as the form, and holds the record back", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Hamlet");

    await user.click(screen.getByRole("button", { name: "Lend: Hamlet" }));
    await user.click(within(screen.getByRole("table")).getByLabelText("Borrower"));
    await user.paste("x".repeat(201));
    await user.click(screen.getByRole("button", { name: "Confirm lend: Hamlet" }));

    expect(screen.getByText(/Borrower cannot be longer than 200 characters/u)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm lend: Hamlet" })).toBeInTheDocument();
    expect(screen.getByLabelText("On loan")).toHaveTextContent("0");
  });

  it("abandons an action without changing anything", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Hamlet");

    await user.click(screen.getByRole("button", { name: "Lend: Hamlet" }));
    await user.type(within(screen.getByRole("table")).getByLabelText("Borrower"), "Ada");
    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("table")).not.toHaveTextContent("Ada");
    expect(screen.getByRole("button", { name: "Lend: Hamlet" })).toBeInTheDocument();
  });
});

describe("free-text categories", () => {
  it("accepts a category nobody configured and lets it be filtered on", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Hamlet", "Novel");
    await addBook(user, "Larousse", "Encyclopaedia");

    await user.selectOptions(screen.getByLabelText("Kind", { selector: "#filter-kind" }), "Encyclopaedia");

    const table = within(screen.getByRole("table"));
    expect(table.getByText("Larousse")).toBeInTheDocument();
    expect(table.queryByText("Hamlet")).not.toBeInTheDocument();
  });

  it("does not split one category into two spellings", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Larousse", "Encyclopaedia");
    await addBook(user, "Britannica", "  encyclopaedia ");

    const options = within(screen.getByLabelText("Kind", { selector: "#filter-kind" })).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["All", "Cookbook", "Encyclopaedia", "Novel"]);
  });
});

describe("resting order", () => {
  it("lists records in the configured order rather than insertion order", async () => {
    const user = userEvent.setup();
    render(<CollectionView entity={entity} />);
    await addBook(user, "Zeno");
    await addBook(user, "Aeneid");

    const shown = screen.getByRole("table").textContent ?? "";
    expect(shown.indexOf("Aeneid")).toBeLessThan(shown.indexOf("Zeno"));
  });
});
