import { useEffect, type ReactNode } from "react";
import { layout, parameters } from "../kernel/config.js";
import type { NavigationSpec } from "../kernel/types.js";
import {
  ChartBarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ListBulletIcon,
  RectangleStackIcon,
} from "@heroicons/react/24/outline";

const navIcons: Record<NavigationSpec["kind"], typeof ListBulletIcon> = {
  collection: ListBulletIcon,
  dashboard: ChartBarIcon,
  landing: GlobeAltIcon,
  screen: RectangleStackIcon,
  content: DocumentTextIcon,
};

/**
 * Chrome is chosen from how many menu entries `parameters.json` declares:
 * one view gets no navigation at all, up to four get a bar, more get a sidebar
 * that becomes a wrapped bar on narrow screens. Vendored from Tailwind Plus
 * application-shells/sidebar for the sidebar case, adapted onto this app's
 * theme tokens instead of a literal `indigo`/`gray` palette.
 */
export function AppShell({
  current,
  onNavigate,
  children,
  aside,
}: {
  current: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { navigation, product, theme } = parameters;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.preset;
    root.dataset.density = theme.density ?? "comfortable";
    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    document.title = product.name;
  }, [theme.preset, theme.density, theme.accent, product.name]);

  const isSidebar = layout === "sidebar";

  return (
    <div
      className={
        isSidebar
          ? "min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start"
          : "min-h-screen flex flex-col"
      }
    >
      <header
        className={
          isSidebar
            ? "bg-surface border-b border-line px-4 py-3 sm:px-6 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:flex lg:flex-col"
            : "bg-surface border-b border-line px-4 py-3 sm:px-6"
        }
      >
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-base font-bold text-ink m-0">{product.name}</p>
            <p className="text-sm text-ink-soft m-0">{product.tagline}</p>
          </div>
          {aside ? <div className="ml-auto">{aside}</div> : null}
        </div>

        {layout === "single" ? null : isSidebar ? (
          <nav className="mt-6 lg:flex lg:flex-1 lg:flex-col" aria-label="Sections">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((entry: NavigationSpec) => {
                const active = entry.id === current;
                const Icon = navIcons[entry.kind];
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={
                        active
                          ? "group flex w-full items-center gap-x-3 rounded-md bg-surface-sunk p-2 text-left text-sm font-semibold text-ink"
                          : "group flex w-full items-center gap-x-3 rounded-md p-2 text-left text-sm font-semibold text-ink-soft hover:bg-surface-sunk hover:text-ink"
                      }
                      aria-current={active ? "page" : undefined}
                      onClick={() => onNavigate(entry.id)}
                    >
                      <Icon
                        aria-hidden="true"
                        className={active ? "size-6 shrink-0 text-accent" : "size-6 shrink-0 text-ink-soft group-hover:text-accent"}
                      />
                      {entry.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : (
          <nav className="flex flex-wrap gap-2 mt-3" aria-label="Sections">
            {navigation.map((entry: NavigationSpec) => {
              const active = entry.id === current;
              return (
                <button
                  key={entry.id}
                  type="button"
                  className={
                    active
                      ? "appearance-none border border-line bg-accent-soft text-ink font-semibold px-4 py-2 rounded-md cursor-pointer text-left"
                      : "appearance-none border border-transparent bg-transparent text-ink-soft font-semibold px-4 py-2 rounded-md cursor-pointer text-left hover:bg-surface-sunk hover:text-ink"
                  }
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(entry.id)}
                >
                  {entry.label}
                </button>
              );
            })}
          </nav>
        )}
      </header>

      <main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full" id="main">
        {children}
      </main>
    </div>
  );
}
