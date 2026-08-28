import { ChevronDownIcon } from "@heroicons/react/20/solid";

/**
 * Vendored from Tailwind Plus navigation/tabs, "Tabs with underline" — a
 * labelled single-select with an underline style on wide screens and a
 * native `<select>` fallback on narrow ones, so it stays usable without
 * horizontal scrolling.
 */
export function Tabs({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 sm:hidden">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-surface py-2 pr-8 pl-3 text-base text-ink outline outline-line focus:outline-2 focus:-outline-offset-2 focus:outline-accent"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <ChevronDownIcon
          aria-hidden="true"
          className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-ink-soft"
        />
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-line">
          <nav aria-label={label} className="-mb-px flex space-x-8">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                aria-current={value === option ? "page" : undefined}
                className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                  value === option ? "border-accent text-accent" : "border-transparent text-ink-soft hover:border-line hover:text-ink"
                }`}
              >
                {option}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
