/**
 * Segmented single-choice control: n options in one joined strip, exactly
 * one active at a time. The strip is one bordered container with internal
 * dividers, not neighbouring buttons pretending to be one control.
 */
export function ButtonGroup({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <span role="group" className="inline-flex divide-x divide-line overflow-hidden rounded-md border border-line">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`px-3 py-1.5 text-sm font-medium ${
              active ? "bg-accent-soft text-accent" : "bg-surface text-ink-soft hover:bg-surface-sunk hover:text-ink"
            }`}
          >
            {option}
          </button>
        );
      })}
    </span>
  );
}
