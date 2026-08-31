import type { MaybePromise, StorageAdapter } from "./repository.js";
import type { StoredRecord } from "../kernel/types.js";
import { coerceRecords } from "./coerceRecords.js";

/**
 * A `StorageAdapter` backed by an HTTP service — the worked proof that the
 * boundary in `repository.ts` really does take a remote store.
 *
 * It is **not** wired up by default: `parameters.persistence.adapter` selects
 * `localStorage`, this app makes no network calls, and nothing here runs unless
 * a deployment opts in. It exists so the claim "write one more adapter and
 * nothing above it changes" can be checked rather than believed — it passes the
 * same `adapterContract` suite as the two local adapters.
 *
 * Wire contract (see API.md and `openapi.json`, both generated from
 * `parameters.json`):
 *
 *   GET  {baseUrl}/{collection}  ->  200, a JSON array of records
 *   PUT  {baseUrl}/{collection}  <-  the full JSON array; 2xx on success
 *
 * The collection is written whole because that is the unit the repository owns.
 * A record-level API is a fifteen-line variant of this file; API.md carries it.
 *
 * `fetch` is injected so this is testable without a network and so a deployment
 * can supply its own — one carrying credentials, a base path, or a retry policy.
 */
export interface HttpAdapterOptions {
  /** Defaults to the global `fetch`. Inject one to add auth, retries, or a test double. */
  fetch?: typeof globalThis.fetch;
  /** Sent on every request. Content-Type is set for writes and cannot be removed. */
  headers?: Record<string, string>;
  /** Milliseconds before a request is abandoned. Omit for no timeout. */
  timeoutMs?: number;
}

export class RemoteWriteError extends Error {
  readonly status: number;

  constructor(status: number, body: string) {
    super(`The store rejected the write (HTTP ${status}). ${body}`.trim());
    this.name = "RemoteWriteError";
    this.status = status;
  }
}

export class RemoteReadError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null, cause?: unknown) {
    super(message, { cause });
    this.name = "RemoteReadError";
    this.status = status;
  }
}

export function createHttpAdapter(baseUrl: string, options: HttpAdapterOptions = {}): StorageAdapter {
  const call = options.fetch ?? globalThis.fetch;
  const root = baseUrl.replace(/\/+$/u, "");
  const url = (collection: string): string => `${root}/${encodeURIComponent(collection)}`;

  const request = async (path: string, init: RequestInit): Promise<Response> => {
    if (options.timeoutMs === undefined) {
      return await call(path, { ...init, headers: { ...options.headers, ...init.headers } });
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      return await call(path, {
        ...init,
        headers: { ...options.headers, ...init.headers },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    /** Read failures reject so the repository can show an honest warning. */
    async read(collection: string): Promise<StoredRecord[]> {
      try {
        const response = await request(url(collection), { method: "GET" });
        if (!response.ok) {
          throw new RemoteReadError(`The store rejected the read (HTTP ${response.status}).`, response.status);
        }
        const body: unknown = await response.json();
        if (!Array.isArray(body)) {
          throw new RemoteReadError("The store returned a non-array collection.", response.status);
        }
        return coerceRecords(body);
      } catch (error) {
        if (error instanceof RemoteReadError) throw error;
        throw new RemoteReadError("The store could not be read.", null, error);
      }
    },

    /** A rejected write is reported, so the repository can roll the change back. */
    async write(collection: string, records: StoredRecord[]): Promise<void> {
      const response = await request(url(collection), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(records),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new RemoteWriteError(response.status, body.slice(0, 200));
      }
    },
  } satisfies { read: (c: string) => MaybePromise<StoredRecord[]>; write: (c: string, r: StoredRecord[]) => MaybePromise<void> } & StorageAdapter;
}
