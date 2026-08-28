import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  ChartBarSquareIcon,
  CheckIcon,
  CheckCircleIcon,
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
import { Badge } from "../Badge.js";
import { Button } from "../Button.js";
import { ButtonGroup } from "../ButtonGroup.js";

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
 * "Projects" in the sidebar switches to a real second section — lists/
 * tables "Simple", re-themed onto the same project names as the deployments
 * list. Clicking "New deployment" chains overlays/modal-dialogs "Centered
 * with single action" (adapted from a generic success notice to a
 * deployment-started one) into overlays/notifications "Simple" on dismiss.
 * All four were dependency-free and asset-free in the catalog, so no new
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

/** Vendored from Tailwind Plus lists/tables, "Simple" — re-themed onto the same projects as `deployments` above. */
const projects = [
  { name: "ios-app", team: "Planetaria", owner: "Michael Foster", environment: "Preview" },
  { name: "mobile-api", team: "Planetaria", owner: "Lindsay Walton", environment: "Production" },
  { name: "tailwindcss.com", team: "Tailwind Labs", owner: "Courtney Henry", environment: "Preview" },
  { name: "company-website", team: "Tailwind Labs", owner: "Courtney Henry", environment: "Preview" },
  { name: "relay-service", team: "Protocol", owner: "Michael Foster", environment: "Production" },
  { name: "android-app", team: "Planetaria", owner: "Michael Foster", environment: "Preview" },
  { name: "api.protocol.chat", team: "Protocol", owner: "Courtney Henry", environment: "Preview" },
  { name: "planetaria.tech", team: "Planetaria", owner: "Whitney Francis", environment: "Preview" },
];

function ProjectsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-line">
        <thead>
          <tr>
            <th scope="col" className="py-3.5 pr-3 pl-4 text-left text-sm font-semibold text-ink sm:pl-6 lg:pl-8">
              Project
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-ink">
              Team
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-ink">
              Owner
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-ink">
              Environment
            </th>
            <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6 lg:pr-8">
              <span className="sr-only">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {projects.map((project) => (
            <tr key={project.name}>
              <td className="py-4 pr-3 pl-4 text-sm font-medium whitespace-nowrap text-ink sm:pl-6 lg:pl-8">
                {project.name}
              </td>
              <td className="px-3 py-4 text-sm whitespace-nowrap text-ink-soft">{project.team}</td>
              <td className="px-3 py-4 text-sm whitespace-nowrap text-ink-soft">{project.owner}</td>
              <td className="px-3 py-4 text-sm whitespace-nowrap">
                <Badge tone={project.environment === "Production" ? "accent" : "neutral"}>{project.environment}</Badge>
              </td>
              <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6 lg:pr-8">
                <a href="#" className="text-accent hover:brightness-110">
                  Edit<span className="sr-only">, {project.name}</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

type Section = "deployments" | "projects";

const SECTION_BY_NAV_NAME: Partial<Record<string, Section>> = {
  Deployments: "deployments",
  Projects: "projects",
};

function SidebarNav({
  otherViews,
  onNavigate,
  section,
  onSelectSection,
}: ShowcaseBlockProps & { section: Section; onSelectSection: (section: Section) => void }) {
  return (
    <nav className="relative flex flex-1 flex-col">
      <ul role="list" className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul role="list" className="-mx-2 space-y-1">
            {navigation.map((item) => {
              const linkedSection = SECTION_BY_NAV_NAME[item.name];
              const active = linkedSection ? section === linkedSection : item.current;
              const itemClassName = classNames(
                active ? "bg-surface text-accent" : "text-ink-soft hover:bg-surface hover:text-accent",
                "group flex w-full gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold",
              );
              const iconClassName = classNames(
                active ? "text-accent" : "text-ink-soft group-hover:text-accent",
                "size-6 shrink-0",
              );
              return (
                <li key={item.name}>
                  {linkedSection ? (
                    <button type="button" onClick={() => onSelectSection(linkedSection)} className={itemClassName}>
                      <item.icon aria-hidden="true" className={iconClassName} />
                      {item.name}
                    </button>
                  ) : (
                    <a href={item.href} className={itemClassName}>
                      <item.icon aria-hidden="true" className={iconClassName} />
                      {item.name}
                    </a>
                  )}
                </li>
              );
            })}
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

const FEED_RANGES = ["24h", "7d", "30d"];

export function HomeScreenSidebar({ otherViews, onNavigate }: ShowcaseBlockProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feedRange, setFeedRange] = useState(FEED_RANGES[0]);
  const [section, setSection] = useState<Section>("deployments");
  const [modalOpen, setModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const finishAction = (): void => {
    setModalOpen(false);
    setToastOpen(true);
  };

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
              <SidebarNav otherViews={otherViews} onNavigate={onNavigate} section={section} onSelectSection={setSection} />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-surface-sunk px-6 ring-1 ring-line">
          <Logo />
          <SidebarNav otherViews={otherViews} onNavigate={onNavigate} section={section} onSelectSection={setSection} />
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
            <h1 className="text-base/7 font-semibold text-ink">
              {section === "deployments" ? "Deployments" : "Projects"}
            </h1>

            <div className="flex items-center gap-x-4">
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
              <Button size="sm" onClick={() => setModalOpen(true)}>
                {section === "deployments" ? "New deployment" : "New project"}
              </Button>
            </div>
          </header>

          {section === "deployments" ? (
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
                  <Badge tone={deployment.environment === "Production" ? "accent" : "neutral"}>
                    {deployment.environment}
                  </Badge>
                  <ChevronRightIcon aria-hidden="true" className="size-5 flex-none text-ink-soft" />
                </li>
              ))}
            </ul>
          ) : (
            <ProjectsTable />
          )}
        </main>

        <aside className="bg-surface-sunk lg:fixed lg:top-16 lg:right-0 lg:bottom-0 lg:w-96 lg:overflow-y-auto lg:border-l lg:border-line">
          <header className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base/7 font-semibold text-ink">Activity feed</h2>
              <a href="#" className="text-sm/6 font-semibold text-accent">
                View all
              </a>
            </div>
            <ButtonGroup options={FEED_RANGES} value={feedRange} onChange={setFeedRange} />
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

      <Dialog open={modalOpen} onClose={setModalOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-ink/50 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
        />
        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel
              transition
              className="relative transform overflow-hidden rounded-lg bg-surface px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6"
            >
              <div>
                <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-ok/10">
                  <CheckIcon aria-hidden="true" className="size-6 text-ok" />
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <DialogTitle as="h3" className="text-base font-semibold text-ink">
                    {section === "deployments" ? "Deployment started" : "Project created"}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-ink-soft">
                      {section === "deployments"
                        ? "Illustrative only — no build actually runs here. In a real app this would kick off the deploy pipeline."
                        : "Illustrative only — no project is actually created here."}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <Button size="md" onClick={finishAction} className="inline-flex w-full justify-center">
                  Done
                </Button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>

      <div aria-live="assertive" className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6">
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          <Transition show={toastOpen}>
            <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-surface shadow-lg outline outline-line transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <CheckCircleIcon aria-hidden="true" className="size-6 text-ok" />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-ink">
                      {section === "deployments" ? "Deployment triggered" : "Project created"}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {section === "deployments" ? "You'll see it appear in the list above shortly." : "It now shows up in the table above."}
                    </p>
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setToastOpen(false)}
                      className="inline-flex rounded-md text-ink-soft hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                    >
                      <span className="sr-only">Close</span>
                      <XMarkIcon aria-hidden="true" className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  );
}
