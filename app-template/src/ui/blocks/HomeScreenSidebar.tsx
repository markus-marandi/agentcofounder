import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  TransitionChild,
} from "@headlessui/react";
import {
  ChartBarSquareIcon,
  Cog6ToothIcon,
  FolderIcon,
  GlobeAltIcon,
  ServerIcon,
  SignalIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowUpTrayIcon,
  Bars3Icon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { parameters } from "../../kernel/config.js";
import type { ShowcaseBlockProps } from "../../kernel/types.js";

/**
 * Vendored from Tailwind Plus (tailwindcss.com/plus/ui-blocks/application-ui/
 * page-examples/home-screens, "Sidebar" example) under this project's
 * Tailwind Plus licence — see THIRD_PARTY_NOTICES.md. Adapted to be offline
 * (no Unsplash/tailwindcss.com asset URLs — initials instead of photos, an
 * inline monogram instead of the fetched logo), theme-token colours instead
 * of literal `indigo`/`gray`, and no `dark:` variants (this app has no dark
 * mode toggle).
 *
 * Built out per docs/tailwind-plus-catalog/: the KPI row is data-display/
 * stats "With trending", and the activity feed is lists/feeds "Simple with
 * icons" (re-themed onto push events instead of job-application events).
 * Both were dependency-free and asset-free in the catalog, so no new
 * adaptation concerns beyond the usual token remap.
 *
 * The deployments/stats/activity content is illustrative sample data, same
 * convention as DashboardGrid's mock plots — it is not wired to the
 * repository yet.
 */

function classNames(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Avatar({ name, size = "size-6" }: { name: string; size?: string }) {
  return (
    <span
      className={classNames(
        size,
        "inline-flex flex-none items-center justify-center rounded-full bg-accent-soft text-[0.625rem] font-medium text-accent",
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** Vendored from Tailwind Plus data-display/stats, "With trending". */
const stats = [
  { name: "Deployments today", value: "12", change: "+8.3%", changeType: "positive" },
  { name: "Failed builds", value: "1", change: "-50.0%", changeType: "positive" },
  { name: "Avg build time", value: "2m 14s", change: "+4.1%", changeType: "negative" },
  { name: "Active projects", value: "8", change: "+12.5%", changeType: "positive" },
];

function StatsRow() {
  return (
    <dl className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 bg-surface px-4 py-6 sm:px-6"
        >
          <dt className="text-sm/6 font-medium text-ink-soft">{stat.name}</dt>
          <dd
            className={classNames(
              stat.changeType === "negative" ? "text-danger" : "text-ink-soft",
              "text-xs font-medium",
            )}
          >
            {stat.change}
          </dd>
          <dd className="w-full flex-none text-2xl/9 font-semibold tracking-tight text-ink">{stat.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const navigation = [
  { name: "Projects", href: "#", icon: FolderIcon, current: false },
  { name: "Deployments", href: "#", icon: ServerIcon, current: true },
  { name: "Activity", href: "#", icon: SignalIcon, current: false },
  { name: "Domains", href: "#", icon: GlobeAltIcon, current: false },
  { name: "Usage", href: "#", icon: ChartBarSquareIcon, current: false },
  { name: "Settings", href: "#", icon: Cog6ToothIcon, current: false },
];

const teams = [
  { id: 1, name: "Planetaria", href: "#", initial: "P", current: false },
  { id: 2, name: "Protocol", href: "#", initial: "P", current: false },
  { id: 3, name: "Tailwind Labs", href: "#", initial: "T", current: false },
];

const statuses: Record<string, string> = {
  offline: "text-ink-soft bg-surface-sunk",
  online: "text-ok bg-ok/10",
  error: "text-danger bg-danger/10",
};

const environments: Record<string, string> = {
  Preview: "text-ink-soft bg-surface-sunk ring-line",
  Production: "text-accent bg-accent-soft ring-accent/30",
};

const deployments = [
  {
    id: 1,
    href: "#",
    projectName: "ios-app",
    teamName: "Planetaria",
    status: "offline",
    statusText: "Initiated 1m 32s ago",
    description: "Deploys from GitHub",
    environment: "Preview",
  },
  {
    id: 2,
    href: "#",
    projectName: "mobile-api",
    teamName: "Planetaria",
    status: "online",
    statusText: "Deployed 3m ago",
    description: "Deploys from GitHub",
    environment: "Production",
  },
  {
    id: 3,
    href: "#",
    projectName: "tailwindcss.com",
    teamName: "Tailwind Labs",
    status: "offline",
    statusText: "Deployed 3h ago",
    description: "Deploys from GitHub",
    environment: "Preview",
  },
  {
    id: 4,
    href: "#",
    projectName: "company-website",
    teamName: "Tailwind Labs",
    status: "online",
    statusText: "Deployed 1d ago",
    description: "Deploys from GitHub",
    environment: "Preview",
  },
  {
    id: 5,
    href: "#",
    projectName: "relay-service",
    teamName: "Protocol",
    status: "online",
    statusText: "Deployed 1d ago",
    description: "Deploys from GitHub",
    environment: "Production",
  },
  {
    id: 6,
    href: "#",
    projectName: "android-app",
    teamName: "Planetaria",
    status: "online",
    statusText: "Deployed 5d ago",
    description: "Deploys from GitHub",
    environment: "Preview",
  },
  {
    id: 7,
    href: "#",
    projectName: "api.protocol.chat",
    teamName: "Protocol",
    status: "error",
    statusText: "Failed to deploy 6d ago",
    description: "Deploys from GitHub",
    environment: "Preview",
  },
  {
    id: 8,
    href: "#",
    projectName: "planetaria.tech",
    teamName: "Planetaria",
    status: "online",
    statusText: "Deployed 6d ago",
    description: "Deploys from GitHub",
    environment: "Preview",
  },
];

const activityItems = [
  { user: "Michael Foster", projectName: "ios-app", commit: "2d89f0c8", branch: "main", date: "1h", dateTime: "2023-01-23T11:00" },
  { user: "Lindsay Walton", projectName: "mobile-api", commit: "249df660", branch: "main", date: "3h", dateTime: "2023-01-23T09:00" },
  { user: "Courtney Henry", projectName: "ios-app", commit: "11464223", branch: "main", date: "12h", dateTime: "2023-01-23T00:00" },
  { user: "Courtney Henry", projectName: "company-website", commit: "dad28e95", branch: "main", date: "2d", dateTime: "2023-01-21T13:00" },
  { user: "Michael Foster", projectName: "relay-service", commit: "624bc94c", branch: "main", date: "5d", dateTime: "2023-01-18T12:34" },
  { user: "Courtney Henry", projectName: "api.protocol.chat", commit: "e111f80e", branch: "main", date: "1w", dateTime: "2023-01-16T15:54" },
  { user: "Michael Foster", projectName: "api.protocol.chat", commit: "5e136005", branch: "main", date: "1w", dateTime: "2023-01-16T11:31" },
  { user: "Whitney Francis", projectName: "ios-app", commit: "5c1fd07f", branch: "main", date: "2w", dateTime: "2023-01-09T08:45" },
];

function Logo() {
  return (
    <div className="flex h-16 shrink-0 items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-ink">
        {parameters.product.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="text-sm font-semibold text-ink">{parameters.product.name}</span>
    </div>
  );
}

function SidebarNav({ otherViews, onNavigate }: ShowcaseBlockProps) {
  return (
    <nav className="relative flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={classNames(
                    item.current ? "bg-surface text-accent" : "text-ink-soft hover:bg-surface hover:text-accent",
                    "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                  )}
                >
                  <item.icon
                    aria-hidden="true"
                    className={classNames(
                      item.current ? "text-accent" : "text-ink-soft group-hover:text-accent",
                      "size-6 shrink-0",
                    )}
                  />
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <div className="text-xs/6 font-semibold text-ink-soft">Your teams</div>
          <ul role="list" className="-mx-2 mt-2 space-y-1">
            {teams.map((team) => (
              <li key={team.name}>
                <a
                  href={team.href}
                  className={classNames(
                    team.current ? "bg-surface text-accent" : "text-ink-soft hover:bg-surface hover:text-accent",
                    "group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold",
                  )}
                >
                  <span
                    className={classNames(
                      team.current ? "border-accent text-accent" : "border-line text-ink-soft group-hover:border-accent group-hover:text-accent",
                      "flex size-6 shrink-0 items-center justify-center rounded-lg border bg-surface text-[0.625rem] font-medium",
                    )}
                  >
                    {team.initial}
                  </span>
                  <span className="truncate">{team.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </li>
        {otherViews.length > 0 ? (
          <li>
            <div className="text-xs/6 font-semibold text-ink-soft">This prototype</div>
            <ul role="list" className="-mx-2 mt-2 space-y-1">
              {otherViews.map((view) => (
                <li key={view.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate(view.id)}
                    className="group flex w-full gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold text-ink-soft hover:bg-surface hover:text-accent"
                  >
                    {view.label}
                  </button>
                </li>
              ))}
            </ul>
          </li>
        ) : null}
        <li className="-mx-6 mt-auto">
          <a href="#" className="flex items-center gap-x-4 px-6 py-3 text-sm/6 font-semibold text-ink hover:bg-surface">
            <Avatar name="Tom Cook" size="size-8" />
            <span className="sr-only">Your profile</span>
            <span aria-hidden="true">Tom Cook</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}

export function HomeScreenSidebar({ otherViews, onNavigate }: ShowcaseBlockProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div>
      <Dialog open={sidebarOpen} onClose={setSidebarOpen} className="relative z-50 xl:hidden">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-ink/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
          >
            <TransitionChild>
              <div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
                <button type="button" onClick={() => setSidebarOpen(false)} className="-m-2.5 p-2.5">
                  <span className="sr-only">Close sidebar</span>
                  <XMarkIcon aria-hidden="true" className="size-6 text-white" />
                </button>
              </div>
            </TransitionChild>

            <div className="relative flex grow flex-col gap-y-5 overflow-y-auto bg-surface-sunk px-6">
              <Logo />
              <SidebarNav otherViews={otherViews} onNavigate={onNavigate} />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-surface-sunk px-6 ring-1 ring-line">
          <Logo />
          <SidebarNav otherViews={otherViews} onNavigate={onNavigate} />
        </div>
      </div>

      <div className="xl:pl-72">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-6 border-b border-line bg-surface px-4 shadow-xs sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="-m-2.5 p-2.5 text-ink xl:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon aria-hidden="true" className="size-5" />
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <form action="#" method="GET" className="grid flex-1 grid-cols-1" onSubmit={(event) => event.preventDefault()}>
              <input
                name="search"
                placeholder="Search"
                aria-label="Search"
                className="col-start-1 row-start-1 block size-full bg-transparent pl-8 text-base text-ink outline-hidden placeholder:text-ink-soft sm:text-sm/6"
              />
              <MagnifyingGlassIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 size-5 self-center text-ink-soft"
              />
            </form>
          </div>
        </div>

        <div className="lg:pr-96">
          <StatsRow />
        </div>

        <main className="lg:pr-96">
          <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <h1 className="text-base/7 font-semibold text-ink">Deployments</h1>

            <Menu as="div" className="relative">
              <MenuButton className="flex items-center gap-x-1 text-sm/6 font-medium text-ink">
                Sort by
                <ChevronUpDownIcon aria-hidden="true" className="size-5 text-ink-soft" />
              </MenuButton>
              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2.5 w-40 origin-top-right rounded-md bg-surface py-2 shadow-lg outline outline-line transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
              >
                <MenuItem>
                  <a href="#" className="block px-3 py-1 text-sm/6 text-ink data-focus:bg-surface-sunk data-focus:outline-hidden">
                    Name
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="#" className="block px-3 py-1 text-sm/6 text-ink data-focus:bg-surface-sunk data-focus:outline-hidden">
                    Date updated
                  </a>
                </MenuItem>
                <MenuItem>
                  <a href="#" className="block px-3 py-1 text-sm/6 text-ink data-focus:bg-surface-sunk data-focus:outline-hidden">
                    Environment
                  </a>
                </MenuItem>
              </MenuItems>
            </Menu>
          </header>

          <ul role="list" className="divide-y divide-line">
            {deployments.map((deployment) => (
              <li key={deployment.id} className="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                <div className="min-w-0 flex-auto">
                  <div className="flex items-center gap-x-3">
                    <div className={classNames(statuses[deployment.status], "flex-none rounded-full p-1")}>
                      <div className="size-2 rounded-full bg-current" />
                    </div>
                    <h2 className="min-w-0 text-sm/6 font-semibold text-ink">
                      <a href={deployment.href} className="flex gap-x-2">
                        <span className="truncate">{deployment.teamName}</span>
                        <span className="text-ink-soft">/</span>
                        <span className="whitespace-nowrap">{deployment.projectName}</span>
                        <span className="absolute inset-0" />
                      </a>
                    </h2>
                  </div>
                  <div className="mt-3 flex items-center gap-x-2.5 text-xs/5 text-ink-soft">
                    <p className="truncate">{deployment.description}</p>
                    <svg viewBox="0 0 2 2" className="size-0.5 flex-none fill-line">
                      <circle r={1} cx={1} cy={1} />
                    </svg>
                    <p className="whitespace-nowrap">{deployment.statusText}</p>
                  </div>
                </div>
                <div className={classNames(environments[deployment.environment], "flex-none rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset")}>
                  {deployment.environment}
                </div>
                <ChevronRightIcon aria-hidden="true" className="size-5 flex-none text-ink-soft" />
              </li>
            ))}
          </ul>
        </main>

        <aside className="bg-surface-sunk lg:fixed lg:top-16 lg:right-0 lg:bottom-0 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-line">
          <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <h2 className="text-base/7 font-semibold text-ink">Activity feed</h2>
            <a href="#" className="text-sm/6 font-semibold text-accent">
              View all
            </a>
          </header>
          <ul role="list" className="-mb-8 px-4 py-4 sm:px-6 lg:px-8">
            {activityItems.map((item, index) => (
              <li key={item.commit}>
                <div className="relative pb-8">
                  {index !== activityItems.length - 1 ? (
                    <span aria-hidden="true" className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-line" />
                  ) : null}
                  <div className="relative flex space-x-3">
                    <span className="flex size-8 flex-none items-center justify-center rounded-full bg-accent ring-8 ring-surface-sunk">
                      <ArrowUpTrayIcon aria-hidden="true" className="size-4 text-accent-ink" />
                    </span>
                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                      <p className="text-sm text-ink-soft">
                        <span className="font-medium text-ink">{item.user}</span> pushed to{" "}
                        <span className="text-ink">{item.projectName}</span> (
                        <span className="font-mono text-ink">{item.commit}</span> on{" "}
                        <span className="text-ink">{item.branch}</span>)
                      </p>
                      <time dateTime={item.dateTime} className="flex-none text-xs whitespace-nowrap text-ink-soft">
                        {item.date}
                      </time>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <p className="px-4 py-4 text-xs text-ink-soft sm:px-6 lg:px-8">Sample figures, shown to illustrate the layout.</p>
        </aside>
      </div>
    </div>
  );
}
