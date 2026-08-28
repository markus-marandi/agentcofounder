import type { ElementType, ComponentPropsWithoutRef } from "react";

/**
 * Base panel shell for tiles, form sections, and list wrappers. Vendored
 * from Tailwind Plus layout/cards ("Basic card"), adapted to this app's
 * existing flat/bordered surface style (border + bg-surface, no shadow)
 * instead of Tailwind's shadow-only recipe, so it matches every panel
 * already built by hand in App.tsx/CollectionView.tsx/DashboardGrid.tsx —
 * this replaces that repeated class string, not a new look.
 *
 * Takes an `as` tag so callers keep whatever landmark semantics they need
 * (`section` with `aria-labelledby`, `li`, ...) instead of always a `div`.
 */
export function Card<T extends ElementType = "div">({
  as,
  className = "",
  ...props
}: { as?: T; className?: string } & Omit<ComponentPropsWithoutRef<T>, "as" | "className">) {
  const Tag = as ?? "div";
  return <Tag className={`rounded-lg border border-line bg-surface overflow-hidden ${className}`.trim()} {...props} />;
}
