/**
 * A labelled single choice. Wide screens render buttons whose active one is
 * underlined; a narrow screen swaps to a native `<select>`, which scrolls
 * its own list instead of clipping the options it cannot fit.
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
      <div className="sm:hidden">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-base text-ink focus:border-accent focus:outline-none"
        >
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <nav aria-label={label} className="flex gap-6 border-b border-line">
          {options.map((option) => {
            const active = option === value;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange(option)}
                aria-current={active ? "page" : undefined}
                className={`-mb-px border-b-2 px-0.5 pt-1 pb-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  active ? "border-accent text-accent" : "border-transparent text-ink-soft hover:text-ink"
                }`}
              >
                {option}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
