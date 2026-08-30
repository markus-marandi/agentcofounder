# Data and integration boundary

Written so this app can gain a backend without its interface being rewritten.
Update it whenever an entity, adapter, or service boundary changes.

## Boundaries

```
components ──▶ Repository<T> ──▶ StorageAdapter ──▶ browser localStorage
                    │
                    └── domain rules live in src/data/operations.ts
```

No component reads or writes storage directly. Swapping in a server means
writing one more `StorageAdapter`; nothing above it changes.

## Repository

`createRepository(collection, adapter)` — `src/data/repository.ts`

| Method | Returns | Notes |
|---|---|---|
| `list()` | `T[]` | A copy; mutating it does not affect stored data |
| `get(id)` | `T \| undefined` | |
| `create(input)` | `T` | Assigns `id` and `createdAt` |
| `update(id, changes)` | `T \| undefined` | `undefined` when the id is unknown; `id` and `createdAt` cannot be overwritten |
| `remove(id)` | `boolean` | `false` when the id is unknown |
| `replaceAll(records)` | `void` | Used for import or reset |
| `subscribe(listener)` | `() => void` | Fires on every change, including from another tab |

A rejected write raises `StorageUnavailableError` and leaves the cached state
untouched, so the interface keeps showing the last state that was actually
stored.

## StorageAdapter

Implement three methods to add a backend:

```ts
interface StorageAdapter {
  read(collection: string): StoredRecord[];        // never throws; returns [] when unreadable
  write(collection: string, records: StoredRecord[]): void;  // throws when the write fails
  subscribe?(collection: string, listener: () => void): () => void;
}
```

Shipped: `createLocalStorageAdapter(namespace)` and `createMemoryAdapter()`.

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

## Not provided

- No HTTP API. Data never leaves the browser.
- No multi-user access, no server-side authorisation, no audit trail.
- No migrations: records stored by an older field set are read leniently and
  missing fields display as empty.
