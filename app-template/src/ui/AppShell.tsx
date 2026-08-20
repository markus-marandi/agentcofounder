import { useEffect, type ReactNode } from "react";
import { layout, parameters } from "../kernel/config.js";
import type { NavigationSpec } from "../kernel/types.js";

/**
 * Chrome is chosen from how many menu entries `parameters.json` declares:
 * one view gets no navigation at all, up to four get a bar, more get a sidebar
 * that becomes a wrapped bar on narrow screens.
 */
export function AppShell({
  current,
  onNavigate,
  children,
  aside,
}: {
  current: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const { navigation, product, theme } = parameters;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme.preset;
    root.dataset.density = theme.density ?? "comfortable";
    if (theme.accent) root.style.setProperty("--accent", theme.accent);
    document.title = product.name;
  }, [theme.preset, theme.density, theme.accent, product.name]);

  return (
    <div className={layout === "sidebar" ? "shell shell-sidebar" : "shell"}>
      <header className="masthead">
        <div className="row">
          <div>
            <p className="masthead-title">{product.name}</p>
            <p className="masthead-tagline">{product.tagline}</p>
          </div>
          {aside ? <div className="row-end">{aside}</div> : null}
        </div>

        {layout === "single" ? null : (
          <nav className="nav" aria-label="Sections" style={{ marginTop: "0.75rem" }}>
            {navigation.map((entry: NavigationSpec) => (
              <button
                key={entry.id}
                type="button"
                className="nav-link"
                aria-current={entry.id === current ? "page" : undefined}
                onClick={() => onNavigate(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="page stack" id="main">
        {children}
      </main>
    </div>
  );
}
