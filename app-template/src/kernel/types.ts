/**
 * Shapes mirrored from `parameters.schema.json`. The schema is the contract the
 * analyzer skill writes against; these types are how the kernel reads it.
 */

export type Route = "landing-page" | "web-app" | "prototype" | "mock-dashboard" | "open-build";

export type FieldType = "text" | "longtext" | "number" | "date" | "select" | "boolean";

export type FilterMode = "equals" | "truthy" | "falsy" | "contains";

export type DerivedKind = "count" | "countWhere" | "sum" | "average" | "min" | "max" | "distinct";

export type PlotKind = "line" | "area" | "bar" | "donut" | "sparkline" | "stat";

export type SourceKind = "timeseries" | "categorical" | "entityCount" | "entityGroup" | "entitySum";

export type ThemePreset =
  | "modern-minimalist"
  | "arctic-frost"
  | "tech-innovation"
  | "ocean-depths"
  | "forest-canopy"
  | "botanical-garden"
  | "golden-hour"
  | "sunset-boulevard"
  | "desert-rose"
  | "midnight-galaxy";

export interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  help?: string;
}

export interface FilterSpec {
  field: string;
  label: string;
  mode?: FilterMode;
}

export interface DerivedSpec {
  id: string;
  label: string;
  kind: DerivedKind;
  field?: string;
  where?: { field: string; mode: FilterMode; value?: unknown };
}

export interface EntitySpec {
  name: string;
  label: string;
  labelPlural: string;
  titleField?: string;
  fields: FieldSpec[];
  filters?: FilterSpec[];
  derived?: DerivedSpec[];
}

export interface NavigationSpec {
  id: string;
  label: string;
  kind: "collection" | "dashboard" | "landing" | "screen" | "content" | "showcase";
  entity?: string;
  screen?: string;
}

/** A vendored Tailwind Plus block id — see app-template/src/ui/blocks/README.md. */
export type ShowcaseBlockId = "home-screen-sidebar";

/**
 * Every showcase block gets the other configured navigation entries and a
 * way to switch to one — a block's own nav links are illustrative, so this
 * is the only real way back to the rest of the app.
 */
export interface ShowcaseBlockProps {
  otherViews: Array<{ id: string; label: string }>;
  onNavigate: (id: string) => void;
}

export interface PlotSpec {
  id: string;
  title: string;
  kind: PlotKind;
  unit?: string;
  source: {
    kind: SourceKind;
    entity?: string;
    field?: string;
    points?: number;
    categories?: string[];
    seed?: number;
    trend?: "up" | "down" | "flat" | "volatile";
  };
}

export interface ScreenSpec {
  id: string;
  title: string;
  body?: string;
  collects?: string[];
  next?: string;
  back?: string;
}

/**
 * Audit trail of which src/ui/* components a configuration reaches — see
 * app-template/COMPONENTS.md. Not read by the kernel; the real switches are
 * navigation[].kind, the dashboard/landing/prototype blocks, and features.auth.
 */
export interface ComponentsRegistry {
  collectionView?: boolean;
  dashboardGrid?: boolean;
  landingPage?: boolean;
  prototypeFlow?: boolean;
  authBar?: boolean;
  chart?: boolean;
  recordForm?: boolean;
  field?: boolean;
  emptyState?: boolean;
  statRow?: boolean;
}

export interface Parameters {
  route: Route;
  product: { name: string; tagline: string; description?: string };
  theme: { preset: ThemePreset; accent?: string; density?: "comfortable" | "compact" };
  navigation: NavigationSpec[];
  entities: EntitySpec[];
  features: { search?: boolean; auth?: boolean; limitations?: string[] };
  dashboard?: { main: PlotSpec; sub: PlotSpec[] };
  landing?: {
    sections: Array<"hero" | "subhero" | "features" | "comparison" | "social-proof" | "faq" | "cta">;
    captureEntity: string;
    callToAction?: string;
    comparisonSet?: string;
  };
  prototype?: { screens: ScreenSpec[]; entity?: string };
  persistence: { adapter: "localStorage" | "memory"; namespace: string };
  components?: ComponentsRegistry;
  showcase?: { blocks: ShowcaseBlockId[] };
}

/** A stored record. Domain fields are open; `id` and `createdAt` are the kernel's. */
export interface StoredRecord {
  id: string;
  createdAt: string;
  [field: string]: unknown;
}
