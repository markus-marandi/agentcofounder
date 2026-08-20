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
    <div className="row" style={{ gap: "0.5rem" }}>
      <label htmlFor="demo-role" className="visually-hidden">
        Demonstration role
      </label>
      <select
        id="demo-role"
        value={session.user?.id ?? ""}
        onChange={(event) => (event.target.value === "" ? auth.signOut() : auth.signIn(event.target.value))}
      >
        <option value="">Signed out</option>
        {auth.listUsers().map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
      <span className="tag">Demo roles</span>
    </div>
  );
}
