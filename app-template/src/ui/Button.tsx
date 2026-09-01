import type { ButtonHTMLAttributes } from "react";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

/** Size is the only variant a caller picks; the accent carries the emphasis. */
const sizes: Record<ButtonSize, string> = {
  xs: "rounded-md px-2 py-0.5 text-xs",
  sm: "rounded-md px-2 py-1 text-xs",
  md: "rounded-md px-2.5 py-1.5 text-sm",
  lg: "rounded-md px-3 py-2 text-sm",
  xl: "rounded-md px-4 py-2.5 text-base",
};

/**
 * The single solid button of the design: accent fill, brightness feedback on
 * hover, and a visible focus ring that comes from the base stylesheet.
 */
export function Button({
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center bg-accent font-semibold text-accent-ink hover:brightness-110 active:brightness-95 disabled:pointer-events-none disabled:opacity-50 ${sizes[size]} ${className}`.trim()}
    />
  );
}
