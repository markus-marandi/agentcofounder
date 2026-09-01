import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogBackdrop, DialogPanel, TransitionChild } from "@headlessui/react";
import { parameters } from "../kernel/config.js";
import { readPreference, writePreference } from "../data/preferences.js";
import type { NavigationSpec } from "../kernel/types.js";
import { Logo } from "./Logo.js";
import { ShellSearchProvider } from "./shellSearch.js";
import {
  ChartBarIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  CodeBracketIcon,
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
    <ul role="list" className="flex flex-col gap-y-0.5">
      {parameters.navigation.map((entry: NavigationSpec) => {
        const active = entry.id === current;
        const Icon = navIcons[entry.kind];
        return (
          <li key={entry.id}>
            <button
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate(entry.id)}
              className={`flex w-full items-center gap-x-3 rounded-md px-2 py-1.5 text-left text-sm font-medium ${
                active ? "bg-surface-sunk text-ink" : "text-ink-soft hover:bg-surface-sunk hover:text-ink"
              }`}
            >
              <Icon
                aria-hidden="true"
                className={`size-5 shrink-0 ${active ? "text-accent" : "text-ink-soft"}`}
              />
              {entry.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The rendered API.md, served by the app's own dev server (see the api-docs
 * plugin in vite.config.ts), so the link opens whenever the app is running.
 * `npm run docs` serves the same page on port 3001 for reading it without the
 * app.
 */
const docsUrl = "/api-docs";

/** Everything inside the rail, shared by the fixed sidebar and the mobile drawer. */
function SidebarBody({ current, onNavigate }: { current: string; onNavigate: (id: string) => void }) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-line bg-surface px-4 pb-4">
      <div className="flex h-14 shrink-0 items-center">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col" aria-label="Sections">
        <NavList current={current} onNavigate={onNavigate} />

        <div className="mt-auto border-t border-line pt-3">
          <a
            href={docsUrl}
            target="_blank"
            rel="noreferrer"
            className="-mx-2 flex items-center gap-x-3 rounded-md px-2 py-1.5 text-sm font-medium text-ink-soft hover:bg-surface-sunk hover:text-ink"
          >
            <CodeBracketIcon aria-hidden="true" className="size-5 shrink-0 text-ink-soft" />
            <span className="min-w-0">
              <span className="block">API docs</span>
              <span className="block text-xs font-normal text-ink-soft">How to connect</span>
            </span>
          </a>
        </div>
      </nav>
    </div>
  );
}

/**
 * The shell is the same every time: a rail on the left, a sticky header with
 * one search field, day/night. It used to be picked from how many menu
 * entries a configuration declared — one entry meant no rail and no header
 * nav at all, so an app with a single view shipped as a bare form on a white
 * page. The chrome is not a per-product decision any more; only what is *in*
 * it is.
 *
 * The search field is real: it is the app's only one, and it publishes its
 * query to the view through `shellSearch` — nothing in this header is
 * decoration.
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
  // null = no explicit choice yet, follow the OS via the prefers-color-scheme rule in presets.css.
  const [mode, setMode] = useState<ColorMode | null>(readStoredMode);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = theme.density ?? "comfortable";
    document.title = product.name;
  }, [theme.density, product.name]);

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

  const entry = navigation.find((candidate) => candidate.id === current) ?? navigation[0];
  const search = useMemo(() => ({ query, setQuery }), [query]);

  const navigateAndClose = (id: string): void => {
    onNavigate(id);
    setDrawerOpen(false);
  };

  return (
    <ShellSearchProvider value={search}>
      <Dialog open={drawerOpen} onClose={setDrawerOpen} className="relative z-50 lg:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-ink/50 duration-300 data-closed:opacity-0"
        />
        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-14 flex w-full max-w-[17rem] flex-1 duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-14 justify-center pt-4 duration-300 ease-in-out data-closed:opacity-0">
                <button type="button" onClick={() => setDrawerOpen(false)} className="p-2">
                  <span className="sr-only">Close menu</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-surface" />
                </button>
              </div>
            </TransitionChild>
            <SidebarBody current={current} onNavigate={navigateAndClose} />
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <SidebarBody current={current} onNavigate={onNavigate} />
      </div>

      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b border-line bg-surface px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setDrawerOpen(true)} className="p-2 text-ink lg:hidden">
            <span className="sr-only">Open menu</span>
            <Bars3Icon aria-hidden="true" className="size-5" />
          </button>

          <div className="grid flex-1 grid-cols-1">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="col-start-1 row-start-1 block size-full bg-transparent pl-9 text-base text-ink outline-none placeholder:text-ink-soft sm:text-sm"
            />
            <MagnifyingGlassIcon
              aria-hidden="true"
              className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-ink-soft"
            />
          </div>

          <div className="flex items-center gap-x-3">
            <button
              type="button"
              className="rounded-full p-1.5 text-ink-soft hover:bg-surface-sunk hover:text-ink"
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

        <main id="main">
          <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-ink">{entry.label}</h1>
              <p className="mt-0.5 truncate text-sm text-ink-soft">{product.tagline}</p>
            </div>
          </header>

          <div className="flex flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </ShellSearchProvider>
  );
}
