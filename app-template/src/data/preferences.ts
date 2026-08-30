import { resolveStorage } from "./browserStorage.js";

/**
 * Interface preferences — how the app looks to this person on this device, not
 * anything the repository owns. They live behind the same storage seam as the
 * records so that `ui/` never reaches for a browser API directly, and so a
 * different `StorageAdapter` backend has one place to intercept.
 */
export function readPreference(key: string, allowed: readonly string[]): string | null {
  const store = resolveStorage();
  if (!store) return null;
  try {
    const stored = store.getItem(key);
    return stored !== null && allowed.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  const store = resolveStorage();
  if (!store) return;
  try {
    store.setItem(key, value);
  } catch {
    // Storage blocked (private browsing, quota) — the choice still holds for this session.
  }
}
