import { HomeIcon } from "@heroicons/react/20/solid";

/** Vendored from Tailwind Plus navigation/breadcrumbs, "Contained". */
export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex">
      <ol role="list" className="flex space-x-4 rounded-md bg-surface px-6 shadow-xs">
        <li className="flex">
          <div className="flex items-center">
            <a href="#" className="text-ink-soft hover:text-ink">
              <HomeIcon aria-hidden="true" className="size-5 shrink-0" />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {items.map((item) => (
          <li key={item.label} className="flex">
            <div className="flex items-center">
              <svg
                fill="currentColor"
                viewBox="0 0 24 44"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="h-full w-6 shrink-0 text-line"
              >
                <path d="M.293 0l22 22-22 22h1.414l22-22-22-22H.293z" />
              </svg>
              {item.href ? (
                <a href={item.href} className="ml-4 text-sm font-medium text-ink-soft hover:text-ink">
                  {item.label}
                </a>
              ) : (
                <span aria-current="page" className="ml-4 text-sm font-medium text-ink">
                  {item.label}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
