import { describe, expect, it } from "vitest";
import { createHttpAdapter, RemoteReadError } from "./httpAdapter.js";

describe("HTTP adapter failures", () => {
  it("rejects a failed read instead of presenting it as an empty collection", async () => {
    const adapter = createHttpAdapter("https://example.test/api", {
      fetch: async () => new Response("offline", { status: 503 }),
    });

    await expect(adapter.read("things")).rejects.toBeInstanceOf(RemoteReadError);
  });

  it("rejects a malformed response instead of presenting it as an empty collection", async () => {
    const adapter = createHttpAdapter("https://example.test/api", {
      fetch: async () => new Response("not json", { status: 200 }),
    });

    await expect(adapter.read("things")).rejects.toMatchObject({
      name: "RemoteReadError",
      message: "The store could not be read.",
    });
  });

  it("rejects a valid non-array response that violates the collection contract", async () => {
    const adapter = createHttpAdapter("https://example.test/api", {
      fetch: async () => Response.json({ error: "not a collection" }),
    });

    await expect(adapter.read("things")).rejects.toMatchObject({
      name: "RemoteReadError",
      message: "The store returned a non-array collection.",
    });
  });
});
