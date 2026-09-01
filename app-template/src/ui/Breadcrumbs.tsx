import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";

/**
 * The trail from the top of the app to where the reader is: a home link,
 * then each parent, then the current page, which is a link only if there is
 * still somewhere further down to go.
 */
export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        <li>
          <a href="#" className="flex text-ink-soft hover:text-ink">
            <HomeIcon aria-hidden="true" className="size-4" />
            <span className="sr-only">Home</span>
          </a>
        </li>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-2">
              <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0 text-line" />
              {item.href && !last ? (
                <a href={item.href} className="font-medium text-ink-soft hover:text-ink">
                  {item.label}
                </a>
              ) : (
                <span aria-current="page" className="font-medium text-ink">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
