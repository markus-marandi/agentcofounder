/**
 * Demonstration accounts. Committed on purpose: `.env` files are blocked for
 * the generating agent, Vite would expose any `VITE_`-prefixed value to the
 * browser anyway, and these are not credentials to anything.
 */
export interface SeedUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

export const seedUsers: SeedUser[] = [
  { id: "admin", name: "Ada Admin", email: "admin@example.test", role: "admin" },
  { id: "user", name: "Sam User", email: "user@example.test", role: "user" },
];
