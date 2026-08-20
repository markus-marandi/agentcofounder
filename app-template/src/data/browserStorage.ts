/**
 * Resolves the browser's storage.
 *
 * `window.localStorage` is read first and deliberately: this is a browser
 * application, and some Node versions define a `globalThis.localStorage` of
 * their own that shadows the one the document actually uses.
 *
 * Access is wrapped because private browsing modes throw on the property
 * itself, not only on use.
 */
export function resolveStorage(override?: Storage): Storage | undefined {
  if (override) return override;
  try {
    const fromWindow = typeof window === "undefined" ? undefined : window.localStorage;
    if (fromWindow) return fromWindow;
  } catch {
    return undefined;
  }
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}
