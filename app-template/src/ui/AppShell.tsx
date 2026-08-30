import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from "@headlessui/react";
import { layout, parameters } from "../kernel/config.js";
import { readPreference, writePreference } from "../data/preferences.js";
import type { NavigationSpec } from "../kernel/types.js";
import { Logo, LogoMark } from "./Logo.js";
import { ShellSearchProvider } from "./shellSearch.js";
import {
  ChartBarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ListBulletIcon,
  MoonIcon,
  RectangleStackIcon,
  SunIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Bars3Icon, MagnifyingGlassIcon } from "@heroicons/react/20/solid";

type ColorMode = "light" | "dark";

const colorModeKey = `${parameters.persistence.namespace}:color-mode`;

const colorModes = ["light", "dark"] as const;

function readStoredMode(): ColorMode | null {
  return readPreference(colorModeKey, colorModes) as ColorMode | null;
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

const navIcons: Record<NavigationSpec["kind"], typeof ListBulletIcon> = {
  collection: ListBulletIcon,
  dashboard: ChartBarIcon,
  landing: GlobeAltIcon,
  screen: RectangleStackIcon,
  content: DocumentTextIcon,
};

/** The sidebar/drawer menu. Rendered twice — fixed rail on wide screens, drawer on narrow ones. */
function NavList({
  current,
  onNavigate,
}: {
  current: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <ul role="list" className="-mx-2 flex flex-col gap-y-1">
      {parameters.navigation.map((entry: NavigationSpec) => {
        const active = entry.id === current;
        const Icon = navIcons[entry.kind];
        return (
          <li key={entry.id}>
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(entry.id)}
              className={`group flex w-full items-center gap-x-3 rounded-md p-2 text-left text-sm font-semibold ${
                active ? "bg-surface-sunk text-ink" : "text-ink-soft hover:bg-surface-sunk hover:text-ink"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-6 shrink-0 ${active ? "text-accent" : "text-ink-soft group-hover:text-ink"}`}
              />
              {entry.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Everything inside the rail, shared by the fixed sidebar and the mobile drawer. */
function SidebarBody({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-line bg-surface px-6 pb-4">
      <div className="flex h-16 shrink-0 items-center">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col" aria-label="Sections">
        <NavList current={current} onNavigate={onNavigate} />
      </nav>
    </div>
  );
}

/**
 * Chrome is chosen from how many menu entries `parameters.json` declares: one
 * view gets no menu at all, up to four get a row of tabs under the header, and
 * more get a sidebar that becomes a drawer on narrow screens.
 *
 * Vendored from Tailwind Plus application-shells/sidebar ("Sidebar with
 * header"), adapted onto this app's theme tokens instead of a literal
 * indigo/gray palette. The one search field lives here, in the header, and is
 * published to the view through `shellSearch` — the header is real chrome, not
 * decoration: everything in it does what it looks like it does.
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
  const { navigation, product, theme, features } = parameters;
  // null = no explicit choice yet, follow the OS via the prefers-color-scheme rule in presets.css.
  const [mode, setMode] = useState<ColorMode | null>(readStoredMode);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.preset;
    root.dataset.density = theme.density ?? "comfortable";
    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    document.title = product.name;
  }, [theme.preset, theme.density, theme.accent, product.name]);

  useEffect(() => {
    const root = document.documentElement;
    if (mode) root.dataset.mode = mode;
    else delete root.dataset.mode;
  }, [mode]);

  const effectiveMode: ColorMode = mode ?? (systemPrefersDark() ? "dark" : "light");

  const toggleMode = (): void => {
    const next: ColorMode = effectiveMode === "dark" ? "light" : "dark";
    setMode(next);
    writePreference(colorModeKey, next);
  };

  const isSidebar = layout === "sidebar";
  const isBar = layout === "bar";
  const entry = navigation.find((candidate) => candidate.id === current) ?? navigation[0];
  const search = useMemo(() => ({ query, setQuery }), [query]);
  const searchEnabled = features.search ?? false;

  const navigateAndClose = (id: string): void => {
    onNavigate(id);
    setDrawerOpen(false);
  };

  return (
    <ShellSearchProvider value={searchEnabled ? search : null}>
      {isSidebar ? (
        <>
          <Dialog open={drawerOpen} onClose={setDrawerOpen} className="relative z-50 lg:hidden">
            <DialogBackdrop
              transition
              className="fixed inset-0 bg-ink/50 transition-opacity duration-300 ease-linear data-closed:opacity-0"
            />
            <div className="fixed inset-0 flex">
              <DialogPanel
                transition
                className="relative mr-16 flex w-full max-w-xs flex-1 transition duration-300 ease-in-out data-closed:-translate-x-full"
              >
                <TransitionChild>
                  <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                    <button type="button" onClick={() => setDrawerOpen(false)} className="-m-2.5 p-2.5">
                      <span className="sr-only">Close menu</span>
                      <XMarkIcon aria-hidden="true" className="size-6 text-surface" />
                    </button>
                  </div>
                </TransitionChild>
                <SidebarBody current={current} onNavigate={navigateAndClose} />
              </DialogPanel>
            </div>
          </Dialog>

          <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
            <SidebarBody current={current} onNavigate={onNavigate} />
          </div>
        </>
      ) : null}

      <div className={isSidebar ? "lg:pl-72" : undefined}>
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-line bg-surface px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          {isSidebar ? (
            <button type="button" onClick={() => setDrawerOpen(true)} className="-m-2.5 p-2.5 text-ink lg:hidden">
              <span className="sr-only">Open menu</span>
              <Bars3Icon aria-hidden="true" className="size-5" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <LogoMark className="size-8 shrink-0 text-accent" />
              <span className="truncate text-sm font-semibold text-ink">{product.name}</span>
            </div>
          )}

          {searchEnabled ? (
            <div className="grid flex-1 grid-cols-1">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                aria-label="Search"
                className="col-start-1 row-start-1 block size-full bg-transparent pl-8 text-base text-ink outline-none placeholder:text-ink-soft sm:text-sm"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-ink-soft"
              />
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-x-3">
            <button
              type="button"
              className="-m-1.5 rounded-full p-1.5 text-ink-soft hover:bg-surface-sunk hover:text-ink"
              onClick={toggleMode}
              aria-label={effectiveMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {effectiveMode === "dark" ? (
                <SunIcon aria-hidden="true" className="size-5" />
              ) : (
                <MoonIcon aria-hidden="true" className="size-5" />
              )}
            </button>
            {aside}
          </div>
        </div>

        {isBar ? (
          <nav aria-label="Sections" className="border-b border-line bg-surface px-4 sm:px-6 lg:px-8">
            <div className="-mb-px flex gap-x-8 overflow-x-auto">
              {navigation.map((item: NavigationSpec) => {
                const active = item.id === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(item.id)}
                    className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                      active ? "border-accent text-accent" : "border-transparent text-ink-soft hover:border-line hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : null}

        <main id="main">
          <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-ink">{entry.label}</h1>
              <p className="mt-1 truncate text-sm text-ink-soft">{product.tagline}</p>
            </div>
          </header>

          <div className="flex flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </ShellSearchProvider>
  );
}
