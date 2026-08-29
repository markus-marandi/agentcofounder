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
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ArrowUpTrayIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
} from "@heroicons/react/20/solid";
import { parameters } from "../../kernel/config.js";
import type { ShowcaseBlockProps } from "../../kernel/types.js";
import { Alert } from "../Alert.js";
import { Badge } from "../Badge.js";
import { Breadcrumbs } from "../Breadcrumbs.js";
import { Button } from "../Button.js";
import { ButtonGroup } from "../ButtonGroup.js";
import { Dropdown } from "../Dropdown.js";
import { Tabs } from "../Tabs.js";

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
 * Also: feedback/alerts "With description" (warning banner, shown when a
 * deployment has failed — new `--warning`/`--warning-soft` tokens added to
 * styles.css since none of the existing four fit), navigation/tabs "Tabs
 * with underline" (environment filter on the deployments list),
 * navigation/breadcrumbs "Contained", navigation/progress-bars "Simple"
 * (repurposed from a form-wizard stepper into a deploy-pipeline tracker for
 * the one in-progress deployment), elements/dropdowns "Simple" (per-row
 * "more actions" menu — trigger swapped for an icon-only ellipsis button),
 * and elements/avatars "Avatar group stacked bottom to top" (photo `<img>`s
 * swapped for the initials `Avatar` already used elsewhere in this file).
 * Also: overlays/drawers "Empty" (a shared `SideDrawer` shell, used for two
 * different triggers) filled with data-display/description-lists
 * "Left-aligned" (clicking a deployment row — team/environment/status/
 * source) or lists/stacked-lists "Simple" (clicking a team in the sidebar —
 * that team's members, "Online"/"Offline" dot instead of a photo), and
 * navigation/pagination "Card footer with page buttons" under the
 * deployments list and projects table (illustrative — the sample arrays are
 * short enough that Previous/Next don't page anything real, same convention
 * as the rest of this file's static data).
 *
 * "Activity" and "Settings" in the sidebar are now real sections too:
 * Activity is data-display/calendars "Small with meetings" — the original's
 * Tailwind v4 `data-*` day-state selectors are simplified to plain
 * conditional classNames here (same `classNames` helper already used
 * throughout this file) rather than replicated exactly, and the month grid
 * is a fixed illustrative sample, not a real calendar. Settings is
 * forms/action-panels "Simple" (a "Rotate deploy tokens" card) stacked with
 * a trimmed forms/form-layouts "Stacked" (workspace name/description plus a
 * Notifications fieldset — a checkbox list and a radio list, both plain
 * static JSX with no relation to this app's `Field.tsx`/`FieldSpec` system,
 * same as everything else in this illustrative block). Clicking the sidebar
 * footer's account row now opens forms/sign-in-forms "Simple", reframed as
 * a "Switch account" confirm dialog in the existing centered-modal shell
 * instead of a full-page screen (the two `tailwindcss.com/plus-assets` logo
 * marks in the original are dropped — this dialog has no logo).
 *
 * All were dependency-free and asset-free in the catalog (avatars aside,
 * which was always going to need the initials swap), so no new adaptation
 * concerns beyond the usual token remap. Alert/Tabs/Breadcrumbs/Dropdown
 * are generic enough to live as shared primitives in ../ rather than here.
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

/** Vendored from Tailwind Plus elements/avatars, "Avatar group stacked bottom to top" — photo `<img>`s swapped for initials. */
function AvatarStack({ names }: { names: string[] }) {
  return (
    <div className="flex -space-x-1 overflow-hidden" title={names.join(", ")}>
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex size-6 flex-none items-center justify-center rounded-full bg-accent-soft text-[0.625rem] font-medium text-accent ring-2 ring-surface"
          aria-hidden="true"
        >
          {initials(name)}
        </span>
      ))}
      <span className="sr-only">{names.join(", ")}</span>
    </div>
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
  { id: 1, name: "Planetaria", initial: "P" },
  { id: 2, name: "Protocol", initial: "P" },
  { id: 3, name: "Tailwind Labs", initial: "T" },
];

/** Vendored from Tailwind Plus lists/stacked-lists, "Simple" — photo avatars swapped for the initials `Avatar`, "Online"/"Offline" dot kept. */
const teamMembers: Record<string, Array<{ name: string; email: string; role: string; online: boolean }>> = {
  Planetaria: [
    { name: "Michael Foster", email: "michael.foster@planetaria.example", role: "Engineer", online: true },
    { name: "Whitney Francis", email: "whitney.francis@planetaria.example", role: "Designer", online: false },
    { name: "Lindsay Walton", email: "lindsay.walton@planetaria.example", role: "Front-end developer", online: true },
  ],
  Protocol: [
    { name: "Michael Foster", email: "michael.foster@protocol.example", role: "Backend engineer", online: false },
    { name: "Courtney Henry", email: "courtney.henry@protocol.example", role: "Site reliability", online: true },
  ],
  "Tailwind Labs": [
    { name: "Courtney Henry", email: "courtney.henry@tailwindlabs.example", role: "Designer", online: true },
    { name: "Whitney Francis", email: "whitney.francis@tailwindlabs.example", role: "Support", online: false },
  ],
};

function TeamMemberList({ members }: { members: Array<{ name: string; email: string; role: string; online: boolean }> }) {
  return (
    <ul role="list" className="divide-y divide-line">
      {members.map((member) => (
        <li key={member.email} className="flex items-center justify-between gap-x-4 py-4">
          <div className="flex min-w-0 gap-x-3">
            <Avatar name={member.name} size="size-10" />
            <div className="min-w-0 flex-auto">
              <p className="text-sm font-semibold text-ink">{member.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink-soft">{member.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <p className="text-sm text-ink">{member.role}</p>
            <p className="mt-1 flex items-center gap-x-1.5 text-xs text-ink-soft">
              <span className={classNames(member.online ? "bg-ok" : "bg-ink-soft/40", "size-1.5 rounded-full")} />
              {member.online ? "Online" : "Offline"}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

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
  { name: "ios-app", team: "Planetaria", owner: "Michael Foster", collaborators: ["Michael Foster", "Whitney Francis"], environment: "Preview" },
  { name: "mobile-api", team: "Planetaria", owner: "Lindsay Walton", collaborators: ["Lindsay Walton", "Michael Foster"], environment: "Production" },
  { name: "tailwindcss.com", team: "Tailwind Labs", owner: "Courtney Henry", collaborators: ["Courtney Henry"], environment: "Preview" },
  { name: "company-website", team: "Tailwind Labs", owner: "Courtney Henry", collaborators: ["Courtney Henry", "Whitney Francis"], environment: "Preview" },
  { name: "relay-service", team: "Protocol", owner: "Michael Foster", collaborators: ["Michael Foster", "Courtney Henry"], environment: "Production" },
  { name: "android-app", team: "Planetaria", owner: "Michael Foster", collaborators: ["Michael Foster"], environment: "Preview" },
  { name: "api.protocol.chat", team: "Protocol", owner: "Courtney Henry", collaborators: ["Courtney Henry", "Michael Foster"], environment: "Preview" },
  { name: "planetaria.tech", team: "Planetaria", owner: "Whitney Francis", collaborators: ["Whitney Francis", "Lindsay Walton"], environment: "Preview" },
];

const PROJECT_ROW_ACTIONS = ["View details", "Duplicate", "Archive"];
const DEPLOYMENT_ROW_ACTIONS = ["View logs", "Redeploy", "Roll back"];
const ENVIRONMENT_FILTERS = ["All", "Preview", "Production"];

/** Vendored from Tailwind Plus navigation/progress-bars, "Simple" — a form-wizard stepper repurposed as a deploy pipeline. */
const DEPLOY_PIPELINE = [
  { id: "Stage 1", name: "Build", status: "complete" },
  { id: "Stage 2", name: "Test", status: "current" },
  { id: "Stage 3", name: "Deploy", status: "upcoming" },
] as const;

function DeployPipeline({ projectName }: { projectName: string }) {
  return (
    <div className="border-b border-line px-4 py-4 sm:px-6 lg:px-8">
      <p className="mb-3 text-xs font-semibold text-ink-soft">In progress: {projectName}</p>
      <nav aria-label="Deploy pipeline">
        <ol role="list" className="space-y-3 md:flex md:space-y-0 md:space-x-8">
          {DEPLOY_PIPELINE.map((step) => (
            <li key={step.name} className="md:flex-1">
              <div
                className={classNames(
                  step.status === "upcoming" ? "border-line" : "border-accent",
                  "flex flex-col border-l-4 py-1 pl-4 md:border-t-4 md:border-l-0 md:pt-3 md:pb-0 md:pl-0",
                )}
              >
                <span className={classNames(step.status === "upcoming" ? "text-ink-soft" : "text-accent", "text-xs font-medium")}>
                  {step.id}
                </span>
                <span className="text-sm font-medium text-ink">{step.name}</span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

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
              Collaborators
            </th>
            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-ink">
              Environment
            </th>
            <th scope="col" className="py-3.5 pr-4 pl-3 sm:pr-6 lg:pr-8">
              <span className="sr-only">Actions</span>
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
                <AvatarStack names={project.collaborators} />
              </td>
              <td className="px-3 py-4 text-sm whitespace-nowrap">
                <Badge tone={project.environment === "Production" ? "accent" : "neutral"}>{project.environment}</Badge>
              </td>
              <td className="py-4 pr-4 pl-3 text-right text-sm font-medium whitespace-nowrap sm:pr-6 lg:pr-8">
                <Dropdown
                  label={`Actions for ${project.name}`}
                  options={PROJECT_ROW_ACTIONS.map((label) => ({ label, onClick: () => {} }))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Vendored from Tailwind Plus overlays/drawers, "Empty" — a shared shell for the deployment-detail and team-members drawers below. */
function SideDrawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/50 transition-opacity duration-500 ease-in-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <DialogPanel
              transition
              className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700"
            >
              <div className="flex h-full flex-col overflow-y-auto bg-surface shadow-xl">
                <div className="border-b border-line px-4 py-6 sm:px-6">
                  <div className="flex items-start justify-between">
                    <DialogTitle className="text-base font-semibold text-ink">{title}</DialogTitle>
                    <div className="ml-3 flex h-7 items-center">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md text-ink-soft hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
                      >
                        <span className="sr-only">Close panel</span>
                        <XMarkIcon aria-hidden="true" className="size-6" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-6 sm:px-6">{children}</div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** Vendored from Tailwind Plus data-display/description-lists, "Left-aligned". */
function DescriptionList({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl className="divide-y divide-line">
      {items.map((item) => (
        <div key={item.label} className="py-4 first:pt-0 sm:grid sm:grid-cols-3 sm:gap-4">
          <dt className="text-sm font-medium text-ink-soft">{item.label}</dt>
          <dd className="mt-1 text-sm text-ink sm:col-span-2 sm:mt-0">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Vendored from Tailwind Plus navigation/pagination, "Card footer with page buttons". Illustrative — sample data is too short to actually page. */
function Pagination({ count, label }: { count: number; label: string }) {
  return (
    <nav aria-label={`${label} pagination`} className="flex items-center justify-between border-t border-line px-4 py-3 sm:px-6 lg:px-8">
      <div className="hidden sm:block">
        <p className="text-sm text-ink-soft">
          Showing <span className="font-medium text-ink">1</span> to <span className="font-medium text-ink">{count}</span> of{" "}
          <span className="font-medium text-ink">{count}</span> results
        </p>
      </div>
      <div className="flex flex-1 justify-between sm:justify-end">
        <a
          href="#"
          className="relative inline-flex items-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunk"
        >
          Previous
        </a>
        <a
          href="#"
          className="relative ml-3 inline-flex items-center rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunk"
        >
          Next
        </a>
      </div>
    </nav>
  );
}

const CALENDAR_WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
/** 2 trailing days of the prior month + a 31-day month + 2 leading days of the next, to fill a 5-row grid. Illustrative — not a real calendar. */
const CALENDAR_DAYS = [
  { day: 27, current: false },
  { day: 28, current: false },
  ...Array.from({ length: 31 }, (_, index) => ({ day: index + 1, current: true })),
  { day: 1, current: false },
  { day: 2, current: false },
];
const CALENDAR_TODAY = 12;
const CALENDAR_SELECTED = 22;

const MEETINGS = [
  { name: "Deploy freeze review", time: "10:00 AM", location: "Video call", attendees: ["Michael Foster", "Courtney Henry"] },
  { name: "Q1 infra planning", time: "1:30 PM", location: "Room 4B", attendees: ["Whitney Francis", "Lindsay Walton", "Michael Foster"] },
  { name: "Incident retro: api.protocol.chat", time: "4:00 PM", location: "Video call", attendees: ["Courtney Henry"] },
];

const MEETING_ROW_ACTIONS = ["Edit", "Cancel"];

/** Vendored from Tailwind Plus data-display/calendars, "Small with meetings" — day-state selectors simplified to conditional classNames, month grid is a fixed illustrative sample. */
function MeetingsCalendar() {
  return (
    <div className="grid grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Illustrative month</h2>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded p-1 text-ink-soft hover:bg-surface-sunk hover:text-ink">
              <span className="sr-only">Previous month</span>
              <ChevronLeftIcon aria-hidden="true" className="size-5" />
            </button>
            <button type="button" className="rounded p-1 text-ink-soft hover:bg-surface-sunk hover:text-ink">
              <span className="sr-only">Next month</span>
              <ChevronRightIcon aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 text-center text-xs font-semibold text-ink-soft">
          {CALENDAR_WEEKDAYS.map((weekday, index) => (
            <div key={index}>{weekday}</div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-sm">
          {CALENDAR_DAYS.map((cell, index) => {
            const isToday = cell.current && cell.day === CALENDAR_TODAY;
            const isSelected = cell.current && cell.day === CALENDAR_SELECTED;
            return (
              <button
                key={index}
                type="button"
                className={classNames(
                  "mx-auto flex size-8 items-center justify-center rounded-full",
                  !cell.current
                    ? "text-ink-soft/40"
                    : isSelected
                      ? "bg-accent font-semibold text-accent-ink"
                      : isToday
                        ? "font-semibold text-accent"
                        : "text-ink hover:bg-surface-sunk",
                )}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold text-ink">Upcoming meetings</h2>
        <ul role="list" className="mt-4 divide-y divide-line">
          {MEETINGS.map((meeting) => (
            <li key={meeting.name} className="flex items-center gap-x-4 py-4">
              <div className="min-w-0 flex-auto">
                <p className="text-sm font-semibold text-ink">{meeting.name}</p>
                <p className="mt-1 flex items-center gap-x-2 text-xs text-ink-soft">
                  <time>{meeting.time}</time>
                  <span aria-hidden="true">&middot;</span>
                  <span className="flex items-center gap-x-1">
                    <MapPinIcon aria-hidden="true" className="size-3.5" />
                    {meeting.location}
                  </span>
                </p>
              </div>
              <AvatarStack names={meeting.attendees} />
              <Dropdown
                label={`Actions for ${meeting.name}`}
                options={MEETING_ROW_ACTIONS.map((label) => ({ label, onClick: () => {} }))}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Vendored from Tailwind Plus forms/action-panels, "Simple". */
function ActionPanel() {
  return (
    <div className="rounded-lg bg-surface-sunk px-4 py-5 shadow-xs ring-1 ring-line sm:flex sm:items-start sm:justify-between sm:p-6">
      <div>
        <h3 className="text-base font-semibold text-ink">Deploy tokens</h3>
        <div className="mt-2 max-w-xl text-sm text-ink-soft">
          <p>Rotate the API tokens CI uses to trigger deployments. Existing tokens keep working until they expire.</p>
        </div>
      </div>
      <div className="mt-5 sm:mt-0 sm:ml-6 sm:flex sm:shrink-0 sm:items-center">
        <Button size="sm">Rotate tokens</Button>
      </div>
    </div>
  );
}

const NOTIFICATION_CHECKBOXES = [
  { id: "deploy-failures", label: "Deploy failures", description: "Get notified when a deployment fails." },
  { id: "weekly-digest", label: "Weekly digest", description: "A summary of the week's deployments and activity." },
  { id: "security-alerts", label: "Security alerts", description: "Get notified about security-relevant events." },
];

const NOTIFICATION_DELIVERY = ["Email", "SMS", "Push"];

/** Vendored from Tailwind Plus forms/form-layouts, "Stacked" — trimmed to a workspace field and the Notifications fieldset (checkbox list + radio list), re-themed from the original Profile/Personal Information/Notifications settings page. */
function SettingsForm() {
  return (
    <form className="space-y-10 border-t border-line pt-8" onSubmit={(event) => event.preventDefault()}>
      <div>
        <h2 className="text-base font-semibold text-ink">Workspace</h2>
        <p className="mt-1 text-sm text-ink-soft">Illustrative only — nothing here is saved.</p>

        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
          <div className="sm:col-span-4">
            <label htmlFor="workspace-name" className="block text-sm font-medium text-ink">
              Workspace name
            </label>
            <div className="mt-2">
              <input
                id="workspace-name"
                name="workspace-name"
                type="text"
                defaultValue={parameters.product.name}
                className="block w-full rounded-md bg-surface px-3 py-1.5 text-sm text-ink outline outline-line focus:outline-2 focus:outline-accent"
              />
            </div>
          </div>

          <div className="col-span-full">
            <label htmlFor="workspace-description" className="block text-sm font-medium text-ink">
              Description
            </label>
            <div className="mt-2">
              <textarea
                id="workspace-description"
                name="workspace-description"
                rows={3}
                defaultValue="Deployments and activity for the team."
                className="block w-full rounded-md bg-surface px-3 py-1.5 text-sm text-ink outline outline-line focus:outline-2 focus:outline-accent"
              />
            </div>
          </div>

          <div className="col-span-full flex items-center gap-x-3">
            <UserCircleIcon aria-hidden="true" className="size-12 text-ink-soft" />
            <Button size="sm">Change logo</Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-ink">Notifications</h2>
        <p className="mt-1 text-sm text-ink-soft">Choose what you hear about, and how.</p>

        <div className="mt-6 space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-ink">By email</legend>
            <div className="mt-4 space-y-4">
              {NOTIFICATION_CHECKBOXES.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex h-6 shrink-0 items-center">
                    <input
                      id={item.id}
                      name={item.id}
                      type="checkbox"
                      defaultChecked
                      className="size-4 rounded-sm border-line text-accent focus:outline-accent"
                    />
                  </div>
                  <div className="text-sm">
                    <label htmlFor={item.id} className="font-medium text-ink">
                      {item.label}
                    </label>
                    <p className="text-ink-soft">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Delivery method</legend>
            <div className="mt-4 space-y-3">
              {NOTIFICATION_DELIVERY.map((method, index) => (
                <div key={method} className="flex items-center gap-3">
                  <input
                    id={`delivery-${method}`}
                    name="delivery-method"
                    type="radio"
                    defaultChecked={index === 0}
                    className="size-4 border-line text-accent focus:outline-accent"
                  />
                  <label htmlFor={`delivery-${method}`} className="text-sm font-medium text-ink">
                    {method}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="flex items-center justify-end gap-x-4">
        <button type="button" className="text-sm font-semibold text-ink-soft hover:text-ink">
          Cancel
        </button>
        <Button size="sm" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}

function SettingsPanel() {
  return (
    <div className="space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      <ActionPanel />
      <SettingsForm />
    </div>
  );
}

/** Vendored from Tailwind Plus forms/sign-in-forms, "Simple" — reframed as a "Switch account" confirm dialog in the existing centered-modal shell instead of a full-page screen; the two logo `<img>`s in the original are dropped. */
function SignInModal({ open, onClose, onSignedIn }: { open: boolean; onClose: () => void; onSignedIn: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/50 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />
      <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative w-full transform overflow-hidden rounded-lg bg-surface px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:max-w-sm sm:p-6"
          >
            <DialogTitle as="h3" className="text-base font-semibold text-ink">
              Switch account
            </DialogTitle>
            <form
              className="mt-4 space-y-4 text-left"
              onSubmit={(event) => {
                event.preventDefault();
                onSignedIn();
              }}
            >
              <div>
                <label htmlFor="switch-email" className="block text-sm font-medium text-ink">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="switch-email"
                    name="email"
                    type="email"
                    defaultValue="tom.cook@planetaria.example"
                    className="block w-full rounded-md bg-surface px-3 py-1.5 text-sm text-ink outline outline-line focus:outline-2 focus:outline-accent"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="switch-password" className="block text-sm font-medium text-ink">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    id="switch-password"
                    name="password"
                    type="password"
                    defaultValue="tailwind-plus-demo"
                    className="block w-full rounded-md bg-surface px-3 py-1.5 text-sm text-ink outline outline-line focus:outline-2 focus:outline-accent"
                  />
                </div>
              </div>
              <p className="text-xs text-ink-soft">Illustrative only — no authentication actually runs here.</p>
              <Button size="md" type="submit" className="inline-flex w-full justify-center">
                Sign in
              </Button>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
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

type Section = "deployments" | "projects" | "activity" | "settings";

const SECTION_BY_NAV_NAME: Partial<Record<string, Section>> = {
  Deployments: "deployments",
  Projects: "projects",
  Activity: "activity",
  Settings: "settings",
};

const SECTION_TITLES: Record<Section, string> = {
  deployments: "Deployments",
  projects: "Projects",
  activity: "Activity",
  settings: "Settings",
};

const NEW_ACTION_LABEL: Partial<Record<Section, string>> = {
  deployments: "New deployment",
  projects: "New project",
  activity: "New meeting",
};

const MODAL_COPY: Partial<Record<Section, { title: string; body: string }>> = {
  deployments: {
    title: "Deployment started",
    body: "Illustrative only — no build actually runs here. In a real app this would kick off the deploy pipeline.",
  },
  projects: { title: "Project created", body: "Illustrative only — no project is actually created here." },
  activity: { title: "Meeting scheduled", body: "Illustrative only — no calendar invite is actually sent here." },
};

const TOAST_COPY: Partial<Record<Section, { title: string; body: string }>> = {
  deployments: { title: "Deployment triggered", body: "You'll see it appear in the list above shortly." },
  projects: { title: "Project created", body: "It now shows up in the table above." },
  activity: { title: "Meeting scheduled", body: "It now shows up on the calendar below." },
};

function SidebarNav({
  otherViews,
  onNavigate,
  section,
  onSelectSection,
  onSelectTeam,
  onOpenSignIn,
}: ShowcaseBlockProps & {
  section: Section;
  onSelectSection: (section: Section) => void;
  onSelectTeam: (team: string) => void;
  onOpenSignIn: () => void;
}) {
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
                <button
                  type="button"
                  onClick={() => onSelectTeam(team.name)}
                  className="group flex w-full gap-x-3 rounded-md p-2 text-left text-sm/6 font-semibold text-ink-soft hover:bg-surface hover:text-accent"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-[0.625rem] font-medium text-ink-soft group-hover:border-accent group-hover:text-accent">
                    {team.initial}
                  </span>
                  <span className="truncate">{team.name}</span>
                </button>
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
          <button
            type="button"
            onClick={onOpenSignIn}
            className="flex w-full items-center gap-x-4 px-6 py-3 text-left text-sm/6 font-semibold text-ink hover:bg-surface"
          >
            <Avatar name="Tom Cook" size="size-8" />
            <span className="sr-only">Switch account</span>
            <span aria-hidden="true">Tom Cook</span>
          </button>
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
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);
  const [envFilter, setEnvFilter] = useState(ENVIRONMENT_FILTERS[0]);
  const [selectedDeployment, setSelectedDeployment] = useState<(typeof deployments)[number] | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  const failedDeployments = deployments.filter((deployment) => deployment.status === "error");
  const inProgressDeployment = deployments.find((deployment) => deployment.status === "offline");
  const visibleDeployments =
    envFilter === "All" ? deployments : deployments.filter((deployment) => deployment.environment === envFilter);

  const modalCopy = MODAL_COPY[section] ?? { title: "", body: "" };
  const newActionLabel = NEW_ACTION_LABEL[section] ?? "";
  const showPagination = section === "deployments" || section === "projects";

  const finishAction = (): void => {
    setModalOpen(false);
    setToast(TOAST_COPY[section] ?? null);
  };

  const finishSignIn = (): void => {
    setSignInOpen(false);
    setToast({ title: "Signed in", body: "Illustrative only — your session didn't actually change." });
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
              <SidebarNav
                otherViews={otherViews}
                onNavigate={onNavigate}
                section={section}
                onSelectSection={setSection}
                onSelectTeam={setSelectedTeam}
                onOpenSignIn={() => setSignInOpen(true)}
              />
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <div className="hidden xl:fixed xl:inset-y-0 xl:z-50 xl:flex xl:w-72 xl:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-surface-sunk px-6 ring-1 ring-line">
          <Logo />
          <SidebarNav
            otherViews={otherViews}
            onNavigate={onNavigate}
            section={section}
            onSelectSection={setSection}
            onSelectTeam={setSelectedTeam}
            onOpenSignIn={() => setSignInOpen(true)}
          />
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

        <div className="pt-4 pr-4 pl-4 sm:pr-6 sm:pl-6 lg:pr-96 lg:pl-8">
          <Breadcrumbs items={[{ label: parameters.product.name, href: "#" }, { label: SECTION_TITLES[section] }]} />
        </div>

        <main className="lg:pr-96">
          <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
            <h1 className="text-base/7 font-semibold text-ink">{SECTION_TITLES[section]}</h1>

            {section === "deployments" || section === "projects" || section === "activity" ? (
              <div className="flex items-center gap-x-4">
                {section === "deployments" || section === "projects" ? (
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
                ) : null}
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  {newActionLabel}
                </Button>
              </div>
            ) : null}
          </header>

          {section === "deployments" && failedDeployments.length > 0 ? (
            <div className="px-4 pt-4 sm:px-6 lg:px-8">
              <Alert tone="warning" title="Attention needed">
                <p>
                  {failedDeployments.length} deployment{failedDeployments.length === 1 ? "" : "s"} failed recently
                  {failedDeployments.length === 1 ? `: ${failedDeployments[0].teamName} / ${failedDeployments[0].projectName}.` : "."}
                </p>
              </Alert>
            </div>
          ) : null}

          {section === "deployments" && inProgressDeployment ? (
            <DeployPipeline projectName={`${inProgressDeployment.teamName} / ${inProgressDeployment.projectName}`} />
          ) : null}

          {section === "deployments" ? (
            <div className="px-4 pt-4 sm:px-6 lg:px-8">
              <Tabs label="Filter by environment" options={ENVIRONMENT_FILTERS} value={envFilter} onChange={setEnvFilter} />
            </div>
          ) : null}

          {section === "deployments" ? (
            <ul role="list" className="divide-y divide-line">
              {visibleDeployments.map((deployment) => (
                <li key={deployment.id} className="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                  <div className="min-w-0 flex-auto">
                    <div className="flex items-center gap-x-3">
                      <div className={classNames(statuses[deployment.status], "flex-none rounded-full p-1")}>
                        <div className="size-2 rounded-full bg-current" />
                      </div>
                      <h2 className="min-w-0 text-sm/6 font-semibold text-ink">
                        <button type="button" onClick={() => setSelectedDeployment(deployment)} className="flex gap-x-2 text-left">
                          <span className="truncate">{deployment.teamName}</span>
                          <span className="text-ink-soft">/</span>
                          <span className="whitespace-nowrap">{deployment.projectName}</span>
                          <span className="absolute inset-0" />
                        </button>
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
                  <div className="relative z-10">
                    <Dropdown
                      label={`Actions for ${deployment.projectName}`}
                      options={DEPLOYMENT_ROW_ACTIONS.map((label) => ({ label, onClick: () => {} }))}
                    />
                  </div>
                  <ChevronRightIcon aria-hidden="true" className="size-5 flex-none text-ink-soft" />
                </li>
              ))}
            </ul>
          ) : section === "projects" ? (
            <ProjectsTable />
          ) : section === "activity" ? (
            <MeetingsCalendar />
          ) : (
            <SettingsPanel />
          )}

          {showPagination ? (
            <Pagination
              count={section === "deployments" ? visibleDeployments.length : projects.length}
              label={SECTION_TITLES[section]}
            />
          ) : null}
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
                    {modalCopy.title}
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-ink-soft">{modalCopy.body}</p>
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

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} onSignedIn={finishSignIn} />

      <div aria-live="assertive" className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6">
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          <Transition show={toast !== null}>
            <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-surface shadow-lg outline outline-line transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
              <div className="p-4">
                <div className="flex items-start">
                  <div className="shrink-0">
                    <CheckCircleIcon aria-hidden="true" className="size-6 text-ok" />
                  </div>
                  <div className="ml-3 w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-ink">{toast?.title}</p>
                    <p className="mt-1 text-sm text-ink-soft">{toast?.body}</p>
                  </div>
                  <div className="ml-4 flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setToast(null)}
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

      <SideDrawer
        open={selectedDeployment !== null}
        title={selectedDeployment ? `${selectedDeployment.teamName} / ${selectedDeployment.projectName}` : ""}
        onClose={() => setSelectedDeployment(null)}
      >
        {selectedDeployment ? (
          <DescriptionList
            items={[
              { label: "Team", value: selectedDeployment.teamName },
              { label: "Environment", value: selectedDeployment.environment },
              { label: "Status", value: selectedDeployment.statusText },
              { label: "Source", value: selectedDeployment.description },
            ]}
          />
        ) : null}
      </SideDrawer>

      <SideDrawer open={selectedTeam !== null} title={selectedTeam ?? ""} onClose={() => setSelectedTeam(null)}>
        {selectedTeam ? <TeamMemberList members={teamMembers[selectedTeam] ?? []} /> : null}
      </SideDrawer>
    </div>
  );
}
