import type { ElementType, ComponentPropsWithoutRef } from "react";

/**
 * The panel every tile, form section, and list sits in: a flat, bordered
 * surface — no shadow — so it matches the shell's rails and headers, which
 * are built the same way. This component exists to retire the repeated
 * class string, not to introduce a second look.
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
  return <Tag className={`overflow-hidden rounded-lg border border-line bg-surface ${className}`.trim()} {...props} />;
}
