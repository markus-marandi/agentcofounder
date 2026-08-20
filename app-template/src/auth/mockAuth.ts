import { seedUsers, type SeedUser } from "./seed-users.js";
import { resolveStorage } from "../data/browserStorage.js";

/**
 * A local stand-in for an identity provider, shaped like one so it can be
 * replaced. `signIn`/`signOut`/`current`/`subscribe` is the same surface a real
 * provider exposes; only this file would change.
 *
 * It authenticates nobody. It selects a demonstration role so role-dependent
 * interface behaviour can be shown and tested without a server.
 */
export interface AuthSession {
  user: SeedUser | null;
}

export interface AuthProvider {
  current(): AuthSession;
  listUsers(): SeedUser[];
  signIn(userId: string): AuthSession;
  signOut(): AuthSession;
  subscribe(listener: (session: AuthSession) => void): () => void;
}

const STORAGE_KEY = "mock-auth:user";

export function createMockAuth(storage?: Storage): AuthProvider {
  const listeners = new Set<(session: AuthSession) => void>();

  const resolve = (): Storage | undefined => resolveStorage(storage);

  const readUserId = (): string | null => {
    try {
      return resolve()?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  };

  const writeUserId = (userId: string | null): void => {
    try {
      const store = resolve();
      if (!store) return;
      if (userId === null) store.removeItem(STORAGE_KEY);
      else store.setItem(STORAGE_KEY, userId);
    } catch {
      // A session that cannot be remembered still works for this page view.
    }
  };

  let session: AuthSession = {
    user: seedUsers.find((candidate) => candidate.id === readUserId()) ?? null,
  };

  const announce = (): void => {
    for (const listener of [...listeners]) listener(session);
  };

  return {
    current: () => session,
    listUsers: () => [...seedUsers],
    signIn(userId) {
      const user = seedUsers.find((candidate) => candidate.id === userId) ?? null;
      session = { user };
      writeUserId(user ? user.id : null);
      announce();
      return session;
    },
    signOut() {
      session = { user: null };
      writeUserId(null);
      announce();
      return session;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
