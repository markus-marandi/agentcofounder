# Data and integration boundary

Written so this app can gain a backend without its interface being rewritten.
Update it whenever an entity, adapter, or service boundary changes.

## Boundaries

```
components ──▶ Repository<T> ──▶ StorageAdapter ──┬─▶ browser localStorage  (shipped, default)
                    │                             ├─▶ in-memory             (shipped)
                    │                             └─▶ HTTP service          (shipped, not wired up)
                    └── domain rules live in src/data/operations.ts
```

No component reads or writes storage directly, and no component knows whether
the store is local or remote. Swapping in a database or a service means writing
one more `StorageAdapter` and passing it to `createRepository`; nothing above
that line changes.

That is checkable rather than asserted. `src/data/adapterContract.ts` is the
suite every adapter must pass, and `src/data/adapterContract.test.ts` runs it
against all three shipped adapters — including the HTTP one, against a stub
server. A fourth adapter is ready for this app exactly when it passes that
suite.

## Repository

`createRepository(collection, adapter)` — `src/data/repository.ts`

| Method | Returns | Notes |
|---|---|---|
| `list()` | `T[]` | A copy, synchronously, whatever the store is |
| `get(id)` | `T \| undefined` | |
| `create(input)` | `T` | Assigns `id` and `createdAt` |
| `update(id, changes)` | `T \| undefined` | `undefined` when the id is unknown; `id` and `createdAt` cannot be overwritten |
| `remove(id)` | `boolean` | `false` when the id is unknown |
| `replaceAll(records)` | `void` | Used for import or reset |
| `subscribe(listener)` | `() => void` | Fires on every change, including from another tab |
| `onError(listener)` | `() => void` | Fires when a shown change was rejected and rolled back |
| `settled()` | `Promise<void>` | Resolves once the first read and every queued write have finished |
| `dispose()` | `void` | Releases the adapter subscription |

Reads are synchronous and writes are optimistic. A change is applied to the
cache and shown immediately, then persisted; if the store rejects it, the
previous records come back and `onError` reports it, so the interface never
keeps showing something that was not stored. Writes are queued, so a store that
answers out of order cannot let an older collection overwrite a newer one.

This is what lets the same components sit on a local store or a network one.

## StorageAdapter

Implement three methods to add a backend:

```ts
type MaybePromise<T> = T | Promise<T>;

interface StorageAdapter {
  // May reject when storage or a service cannot be read; the repository preserves confirmed data and tells the user.
  read(collection: string): MaybePromise<StoredRecord[]>;
  // Rejects when the write fails; the repository rolls back and tells the user.
  write(collection: string, records: StoredRecord[]): MaybePromise<void>;
  // Optional: fires when something outside this tab changed the collection.
  subscribe?(collection: string, listener: () => void): () => void;
}
```

The return types are the point. A local store answers immediately, a database
or a service answers later, and both satisfy the same interface — so adding a
backend never reaches past this file.

Shipped:

| Adapter | File | Used by |
|---|---|---|
| `createLocalStorageAdapter(namespace)` | `src/data/localStorageAdapter.ts` | the app, by default |
| `createMemoryAdapter(seed?)` | `src/data/memoryAdapter.ts` | tests, and `persistence.adapter: "memory"` |
| `createHttpAdapter(baseUrl, options)` | `src/data/httpAdapter.ts` | nothing, until a deployment opts in |

`createHttpAdapter` takes its `fetch` by injection, so it can carry
credentials, a base path, or a retry policy, and so it is tested without a
network. This app makes no network calls.

## Entities

Generated from `parameters.json`; do not edit this section by hand.

### Records (`record`)

Title field: `title`. Every stored record also carries `id` and `createdAt`.

| Field | Type | Required |
|---|---|---|
| `title` (Title) | `text` | yes |
| `category` (Category) | `combobox` | no |
| `amount` (Amount) | `number` | no |
| `done` (Done) | `boolean` | no |
| `completedOn` (Completed on) | `date` | no |

Filters: `Category (equals category)`, `Done only (truthy done)`.
Derived values: `Records (count)`, `Not done (countWhere)`.
Row actions: `Mark done (complete)`, `Reopen (reopen)`.

Row actions use the same `repository.update(id, changes)` boundary as edits.
`@today` and `@now` values are resolved in `src/data/operations.ts`.

## Authentication

`src/auth/mockAuth.ts` implements `AuthProvider` —
`current()`, `listUsers()`, `signIn(userId)`, `signOut()`, `subscribe(listener)`.
It authenticates nobody; it selects a demonstration role. A real provider
implements the same interface.

## Getting the data out

`src/data/portability.ts` exports and re-imports collections through the
repository, which is the first step of moving to a database: export here, load
there, point the app at an adapter for that store. **Export JSON** and
**Import JSON** sit above the collection.

The envelope is deliberately dull, and its records match the schemas below
exactly:

```json
{
  "format": "agent-cofounder-app/export",
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "collections": { "<entity>": [ /* records */ ] }
}
```

An import is hardened the same way a stored collection is: a malformed record
is dropped rather than allowed to reach the interface, and a file from a newer
version is refused with a reason.

<!-- generated:contract -->

## Boundaries this app draws deliberately

- **No server, by choice, not by omission.** Data stays in this browser. The
  HTTP boundary is implemented and tested; it is simply not switched on.
- **No multi-user access, no server-side authorisation, no audit trail.** A
  real deployment adds these behind the same adapter and `AuthProvider` seams.
- **No merge of concurrent remote edits.** The repository is local-first: a read
  that lands after a local change is dropped rather than allowed to undo it. A
  store needing merge semantics does the merging inside its adapter.
- **No migrations.** Records stored by an older field set are read leniently and
  missing fields display as empty.
