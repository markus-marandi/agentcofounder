import { beforeEach, describe, expect, it } from "vitest";
import { createMockAuth } from "./mockAuth.js";

describe("mock auth", () => {
  beforeEach(() => window.localStorage.clear());

  it("starts signed out and offers the seeded roles", () => {
    const auth = createMockAuth();
    expect(auth.current().user).toBeNull();
    expect(auth.listUsers().map((user) => user.role)).toEqual(["admin", "user"]);
  });

  it("remembers the selected role across a reload", () => {
    createMockAuth().signIn("admin");
    expect(createMockAuth().current().user?.role).toBe("admin");
  });

  it("ignores an unknown role instead of throwing", () => {
    expect(createMockAuth().signIn("nobody").user).toBeNull();
  });

  it("clears the stored role on sign out", () => {
    const auth = createMockAuth();
    auth.signIn("user");
    auth.signOut();
    expect(createMockAuth().current().user).toBeNull();
  });

  it("keeps working when storage is unavailable", () => {
    const blocked = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    } as unknown as Storage;
    const auth = createMockAuth(blocked);
    expect(auth.signIn("admin").user?.id).toBe("admin");
  });
});
