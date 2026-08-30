import { parameters } from "../kernel/config.js";

/**
 * The generated app's brand mark, drawn inline rather than loaded from
 * `public/logo.svg` so it inherits `currentColor` — the shell tints it with
 * the accent the active theme preset chose, and it flips with day/night
 * along with everything else. The same geometry is committed as
 * `public/logo.svg` / `public/favicon.svg` for the browser tab, where CSS
 * variables are out of reach.
 *
 * The glyph is knocked out of the tile with `fill-rule="evenodd"`, so the
 * rows are transparent and the mark needs no background of its own.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className} fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 2h12a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8H10a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8Zm-0.5 7.5h13a1.5 1.5 0 0 1 0 3h-13a1.5 1.5 0 0 1 0-3Zm0 5h13a1.5 1.5 0 0 1 0 3h-13a1.5 1.5 0 0 1 0-3Zm0 5h7a1.5 1.5 0 0 1 0 3h-7a1.5 1.5 0 0 1 0-3ZM21 19.25a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5Z"
      />
    </svg>
  );
}

/**
 * Mark plus the product name from `parameters.json`. Every generated app gets
 * the same mark and its own name — the wordmark is never hard-coded here. The
 * tagline is deliberately not repeated beside it: the page header already
 * carries it, and a truncated second line in an 18rem rail reads as a bug.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-3 ${className}`.trim()}>
      <LogoMark className="size-8 shrink-0 text-accent" />
      <span className="truncate text-sm font-semibold text-ink">{parameters.product.name}</span>
    </span>
  );
}
