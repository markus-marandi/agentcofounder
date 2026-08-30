import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Vitest is not configured with `globals`, so Testing Library's automatic
 * cleanup does not register itself. Without this each test would inherit the
 * previous test's DOM and queries would match more than one element.
 */
afterEach(cleanup);

/**
 * jsdom does not always supply `localStorage` — on some Node versions a
 * built-in global of the same name shadows it. Tests should not depend on which
 * Node version happens to be running, so an in-memory implementation is
 * installed whenever a working one is absent.
 */
function usableStorage(value: unknown): value is Storage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Storage>;
  return [candidate.clear, candidate.getItem, candidate.key, candidate.removeItem, candidate.setItem].every(
    (method) => typeof method === "function",
  );
}

export function installStorage(): void {
  try {
    if (usableStorage(window.localStorage)) return;
  } catch {
    // Fall through and install the stand-in.
  }

  const entries = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(String(key)) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => entries.delete(String(key)) as unknown as void,
    setItem: (key, value) => {
      entries.set(String(key), String(value));
    },
  };

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => storage,
  });
}

installStorage();
