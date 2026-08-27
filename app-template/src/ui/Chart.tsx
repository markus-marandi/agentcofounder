import type { PlotKind } from "../kernel/types.js";
import type { Point } from "../mock/generators.js";

/**
 * Charts are hand-drawn SVG on purpose: no charting dependency, no network, and
 * full control of accessible names. Each chart also exposes its numbers as text
 * so the data is reachable without reading the picture.
 */

const WIDTH = 320;
const HEIGHT = 140;
const PAD = 8;

function scale(points: Point[]): { min: number; max: number } {
  const values = points.map((point) => point.value);
  const max = values.length > 0 ? Math.max(...values) : 1;
  const min = values.length > 0 ? Math.min(...values, 0) : 0;
  return { min, max: max === min ? min + 1 : max };
}

function pathFor(points: Point[], close: boolean): string {
  const { min, max } = scale(points);
  const stepX = points.length > 1 ? (WIDTH - PAD * 2) / (points.length - 1) : 0;
  const coordinates = points.map((point, index) => {
    const x = PAD + index * stepX;
    const y = HEIGHT - PAD - ((point.value - min) / (max - min)) * (HEIGHT - PAD * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${coordinates.join(" L")}`;
  if (!close) return line;
  return `${line} L${(PAD + (points.length - 1) * stepX).toFixed(2)},${HEIGHT - PAD} L${PAD},${HEIGHT - PAD} Z`;
}

function summarise(points: Point[], unit?: string): string {
  if (points.length === 0) return "No data yet.";
  const suffix = unit ? ` ${unit}` : "";
  return points.map((point) => `${point.label}: ${point.value}${suffix}`).join(", ");
}

export interface ChartProps {
  kind: PlotKind;
  points: Point[];
  title: string;
  unit?: string;
}

export function Chart({ kind, points, title, unit }: ChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-ink-soft" role="img" aria-label={`${title}: no data yet`}>
        No data yet.
      </p>
    );
  }

  if (kind === "stat") {
    const total = points.reduce((sum, point) => sum + point.value, 0);
    return (
      <p
        className="text-2xl font-semibold tracking-tight text-ink tabular-nums"
        aria-label={`${title}: ${total}${unit ? ` ${unit}` : ""}`}
      >
        {Number.isInteger(total) ? total : total.toFixed(1)}
        {unit ? <span className="text-sm font-normal text-ink-soft"> {unit}</span> : null}
      </p>
    );
  }

  const label = `${title}. ${summarise(points, unit)}`;

  if (kind === "donut") {
    const total = points.reduce((sum, point) => sum + point.value, 0) || 1;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    return (
      <>
        <svg className="w-full h-auto block overflow-visible" viewBox="0 0 160 140" role="img" aria-label={label}>
          <g transform="translate(80 70) rotate(-90)">
            {points.map((point, index) => {
              const length = (point.value / total) * circumference;
              const circle = (
                <circle
                  key={point.label}
                  r={radius}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={18}
                  strokeOpacity={1 - index * (0.7 / Math.max(points.length, 1))}
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return circle;
            })}
          </g>
        </svg>
        <ul className="list-none p-0 m-0 mt-2 flex flex-wrap gap-4 text-sm text-ink-soft">
          {points.map((point, index) => (
            <li key={point.label}>
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5"
                style={{ background: "var(--accent)", opacity: 1 - index * (0.7 / Math.max(points.length, 1)) }}
              />
              {point.label} ({point.value})
            </li>
          ))}
        </ul>
      </>
    );
  }

  if (kind === "bar") {
    const { max } = scale(points);
    const slot = (WIDTH - PAD * 2) / points.length;
    return (
      <svg className="w-full h-auto block overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
        {points.map((point, index) => {
          const height = (point.value / max) * (HEIGHT - PAD * 2);
          return (
            <rect
              key={point.label}
              x={PAD + index * slot + slot * 0.15}
              y={HEIGHT - PAD - height}
              width={slot * 0.7}
              height={Math.max(height, 1)}
              rx={3}
              fill="var(--accent)"
            />
          );
        })}
      </svg>
    );
  }

  const isArea = kind === "area";
  const strokeWidth = kind === "sparkline" ? 1.6 : 2.4;

  return (
    <svg className="w-full h-auto block overflow-visible" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={label}>
      {isArea ? <path d={pathFor(points, true)} fill="var(--accent-soft)" /> : null}
      <path d={pathFor(points, false)} fill="none" stroke="var(--accent)" strokeWidth={strokeWidth} strokeLinejoin="round" />
    </svg>
  );
}
