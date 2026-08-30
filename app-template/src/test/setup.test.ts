import { expect, it } from "vitest";
import { installStorage } from "./setup";

it("replaces a truthy but unusable Node localStorage global", () => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {},
  });

  installStorage();

  expect(typeof window.localStorage.clear).toBe("function");
  window.localStorage.setItem("key", "value");
  expect(window.localStorage.getItem("key")).toBe("value");
});
