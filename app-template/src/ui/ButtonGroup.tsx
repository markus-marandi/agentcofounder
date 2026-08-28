/** Vendored from Tailwind Plus elements/button-groups ("Basic") — a segmented single-choice control. */
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
    <span className="inline-flex rounded-md shadow-xs isolate">
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`relative inline-flex items-center px-3 py-2 text-sm font-semibold ring-1 ring-inset ring-line focus:z-10 ${
            value === option ? "bg-accent-soft text-accent" : "bg-surface text-ink-soft hover:bg-surface-sunk"
          } ${index === 0 ? "rounded-l-md" : "-ml-px"} ${index === options.length - 1 ? "rounded-r-md" : ""}`}
        >
          {option}
        </button>
      ))}
    </span>
  );
}
