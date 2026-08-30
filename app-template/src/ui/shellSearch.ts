import { createContext, useContext } from "react";

/**
 * The one search box in the chrome, shared with whichever view is on screen.
 *
 * `AppShell` owns the query and publishes it here; `CollectionView` reads it
 * instead of rendering a second search field beside the shell's. Rendered
 * outside a shell — in a test, or embedded in another page — the context is
 * null and the view falls back to its own box, so no component depends on
 * being mounted inside the shell to be searchable.
 */
export interface ShellSearch {
  query: string;
  setQuery: (query: string) => void;
}

const ShellSearchContext = createContext<ShellSearch | null>(null);

export const ShellSearchProvider = ShellSearchContext.Provider;

export function useShellSearch(): ShellSearch | null {
  return useContext(ShellSearchContext);
}
