import { useEffect, useMemo, useState } from "react";
import { createMockAuth, type AuthSession } from "../auth/mockAuth.js";

/**
 * Demonstration role switching. It is labelled as such because pretending to be
 * a login would misrepresent what the app does.
 */
export function AuthBar({ onSession }: { onSession?: (session: AuthSession) => void }) {
  const auth = useMemo(() => createMockAuth(), []);
  const [session, setSession] = useState<AuthSession>(() => auth.current());

  useEffect(() => {
    onSession?.(session);
    return auth.subscribe((next) => {
      setSession(next);
      onSession?.(next);
    });
  }, [auth, session, onSession]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="demo-role" className="sr-only">
        Demonstration role
      </label>
      <select
        id="demo-role"
        value={session.user?.id ?? ""}
        onChange={(event) => (event.target.value === "" ? auth.signOut() : auth.signIn(event.target.value))}
        className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm text-ink focus:outline-none"
      >
        <option value="">Signed out</option>
        {auth.listUsers().map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
      <span className="inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent-soft text-ink">
        Demo roles
      </span>
    </div>
  );
}
