import { useState } from "react";
import { defaultEntity, entityByName, parameters } from "./kernel/config.js";
import { useRepository } from "./kernel/useRepository.js";
import type { NavigationSpec } from "./kernel/types.js";
import { AppShell } from "./ui/AppShell.js";
import { AuthBar } from "./ui/AuthBar.js";
import { CollectionView } from "./ui/CollectionView.js";
import { DashboardGrid } from "./ui/DashboardGrid.js";
import { ErrorBoundary } from "./ui/ErrorBoundary.js";
import { LandingPage } from "./ui/LandingPage.js";
import { Limitations } from "./ui/Limitations.js";
import { PrototypeFlow } from "./ui/PrototypeFlow.js";

/**
 * Renders whichever view a navigation entry declares. Every view sits on the
 * same persisted store, so the route changes what the product looks like, never
 * whether its data survives.
 */
function View({ entry }: { entry: NavigationSpec }) {
  const entity = entityByName(entry.entity) ?? defaultEntity();
  const dashboardRecords = useRepository(entity.name).records;

  switch (entry.kind) {
    case "landing":
      return <LandingPage entity={entityByName(parameters.landing?.captureEntity) ?? entity} />;
    case "screen":
      return <PrototypeFlow entity={entityByName(parameters.prototype?.entity) ?? entity} />;
    case "dashboard": {
      const dashboard = parameters.dashboard;
      if (!dashboard) {
        return (
          <p className="notice notice-error" role="alert">
            No dashboard is configured in parameters.json.
          </p>
        );
      }
      return <DashboardGrid main={dashboard.main} sub={dashboard.sub} records={dashboardRecords} />;
    }
    case "content":
      return (
        <section className="panel stack">
          <h2>{entry.label}</h2>
          <p className="muted">{parameters.product.description ?? parameters.product.tagline}</p>
        </section>
      );
    case "collection":
    default:
      return <CollectionView entity={entity} searchEnabled={parameters.features.search ?? false} />;
  }
}

export function App() {
  const [current, setCurrent] = useState(parameters.navigation[0].id);
  const entry = parameters.navigation.find((candidate) => candidate.id === current) ?? parameters.navigation[0];

  return (
    <AppShell
      current={entry.id}
      onNavigate={setCurrent}
      aside={parameters.features.auth ? <AuthBar /> : undefined}
    >
      <ErrorBoundary label={entry.label}>
        <View entry={entry} />
      </ErrorBoundary>
      <Limitations />
    </AppShell>
  );
}
