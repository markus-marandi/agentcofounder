import { useCallback, useEffect, useMemo, useState } from "react";
import { createRepository, StorageUnavailableError, type Repository } from "../data/repository.js";
import { createLocalStorageAdapter } from "../data/localStorageAdapter.js";
import { createMemoryAdapter } from "../data/memoryAdapter.js";
import type { StoredRecord } from "./types.js";
import { parameters } from "./config.js";

/** One adapter per app, chosen by `parameters.persistence.adapter`. */
export const adapter =
  parameters.persistence.adapter === "memory"
    ? createMemoryAdapter()
    : createLocalStorageAdapter(parameters.persistence.namespace);

const repositories = new Map<string, Repository>();

export function repositoryFor(collection: string): Repository {
  let repository = repositories.get(collection);
  if (!repository) {
    repository = createRepository(collection, adapter);
    repositories.set(collection, repository);
  }
  return repository;
}

/** Test seam: drops cached repositories so each test starts clean. */
export function resetRepositories(): void {
  for (const repository of repositories.values()) repository.dispose();
  repositories.clear();
}

export interface RepositoryState {
  records: StoredRecord[];
  /** Set when storage cannot be read or a write is rejected. */
  storageError: string | null;
  dismissStorageError: () => void;
  run: <T>(operation: () => T) => T | undefined;
  repository: Repository;
}

/**
 * Subscribes a component to a collection and funnels every write through `run`,
 * which converts a storage failure into a message instead of a blank screen.
 */
export function useRepository(collection: string, providedRepository?: Repository): RepositoryState {
  const repository = useMemo(
    () => providedRepository ?? repositoryFor(collection),
    [collection, providedRepository],
  );
  const [records, setRecords] = useState<StoredRecord[]>(() => repository.list());
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    setRecords(repository.list());
    const stopWatching = repository.subscribe(() => setRecords(repository.list()));
    // A write is shown before the store has accepted it, so a rejection arrives
    // here rather than as a throw from the call that made the change.
    const stopListeningForErrors = repository.onError((error) => setStorageError(error?.message ?? null));
    return () => {
      stopWatching();
      stopListeningForErrors();
    };
  }, [repository]);

  const run = useCallback(<T,>(operation: () => T): T | undefined => {
    try {
      const outcome = operation();
      setStorageError(null);
      return outcome;
    } catch (error) {
      setStorageError(
        error instanceof StorageUnavailableError
          ? error.message
          : "Something went wrong and the change was not saved.",
      );
      return undefined;
    }
  }, []);

  const dismissStorageError = useCallback(() => setStorageError(null), []);

  return { records, storageError, dismissStorageError, run, repository };
}
