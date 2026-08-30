import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "./AppShell.js";
import { parameters } from "../kernel/config.js";

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.mode;
});

function shell() {
  return render(
    <AppShell current={parameters.navigation[0].id} onNavigate={() => {}}>
      <p>view content</p>
    </AppShell>,
  );
}

describe("app shell", () => {
  it("offers every navigation entry the configuration declares, and nothing else", () => {
    shell();
    const labels = parameters.navigation.map((entry) => entry.label);
    for (const label of labels) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    // The chrome used to carry a row of decorative tabs that navigated nowhere.
    const named = screen
      .getAllByRole("button")
      .map((button) => button.textContent?.trim())
      .filter((text): text is string => Boolean(text));
    expect(named.filter((text) => !labels.includes(text) && text !== "Open menu")).toEqual([]);
  });

  it("shows the search box once when search is on, and not at all when it is off", () => {
    shell();
    expect(screen.queryAllByRole("searchbox", { name: "Search" })).toHaveLength(
      parameters.features.search ? 1 : 0,
    );
  });

  it("remembers the day/night choice", async () => {
    const user = userEvent.setup();
    shell();

    await user.click(screen.getByRole("button", { name: /Switch to (dark|light) mode/u }));

    const chosen = document.documentElement.dataset.mode;
    expect(chosen).toMatch(/^(light|dark)$/u);
    expect(window.localStorage.getItem(`${parameters.persistence.namespace}:color-mode`)).toBe(chosen);
  });
});
