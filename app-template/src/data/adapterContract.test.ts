import { describe } from "vitest";
import { adapterContract } from "./adapterContract.js";
import { createMemoryAdapter } from "./memoryAdapter.js";
import { createLocalStorageAdapter } from "./localStorageAdapter.js";
import { createHttpAdapter } from "./httpAdapter.js";
import type { StoredRecord } from "../kernel/types.js";

/** A `Storage` that lives only for one test, so the browser one is not involved. */
function fakeStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key);
    },
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

/**
 * The smallest server that satisfies the wire contract in API.md: a collection
 * is read whole and written whole. No network — this is the `fetch` the HTTP
 * adapter is handed.
 */
function stubServer(): typeof globalThis.fetch {
  const collections = new Map<string, StoredRecord[]>();
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input);
    const collection = decodeURIComponent(path.slice(path.lastIndexOf("/") + 1));
    if ((init?.method ?? "GET") === "GET") {
      const records = collections.get(collection);
      if (!records) return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      return new Response(JSON.stringify(records), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    collections.set(collection, JSON.parse(String(init?.body ?? "[]")) as StoredRecord[]);
    return new Response(null, { status: 204 });
  }) as typeof globalThis.fetch;
}

/**
 * One contract, three transports. An adapter that passes this is ready to back
 * the app; nothing above `src/data/repository.ts` is consulted or changed.
 */
describe("in-memory adapter", () => {
  adapterContract({ create: () => createMemoryAdapter() });
});

describe("localStorage adapter", () => {
  adapterContract({ create: () => createLocalStorageAdapter("contract-test", fakeStorage()) });
});

describe("HTTP adapter", () => {
  adapterContract({ create: () => createHttpAdapter("https://example.test/api", { fetch: stubServer() }) });
});
