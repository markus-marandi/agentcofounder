import type { ButtonHTMLAttributes } from "react";

export type ButtonSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ButtonSize, string> = {
  xs: "rounded-sm px-2 py-1 text-xs",
  sm: "rounded-sm px-2 py-1 text-sm",
  md: "rounded-md px-2.5 py-1.5 text-sm",
  lg: "rounded-md px-3 py-2 text-sm",
  xl: "rounded-md px-3.5 py-2.5 text-sm",
};

/**
 * Vendored from Tailwind Plus elements/buttons ("Primary buttons"), 5 sizes
 * collapsed onto this app's `--accent` token instead of a literal `indigo`.
 */
export function Button({
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={`font-semibold text-accent-ink bg-accent shadow-xs hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-55 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`.trim()}
    />
  );
}
