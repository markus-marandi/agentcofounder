import { useState } from "react";
import { defaultEntity, entityByName, parameters } from "./kernel/config.js";
import { useRepository } from "./kernel/useRepository.js";
import type { NavigationSpec } from "./kernel/types.js";
import { AppShell } from "./ui/AppShell.js";
import { Alert } from "./ui/Alert.js";
import { AuthBar } from "./ui/AuthBar.js";
import { Card } from "./ui/Card.js";
import { CollectionView } from "./ui/CollectionView.js";
import { DashboardGrid } from "./ui/DashboardGrid.js";
import { ErrorBoundary } from "./ui/ErrorBoundary.js";
import { LandingPage } from "./ui/LandingPage.js";
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
        return <Alert tone="danger" title="No dashboard is configured in parameters.json." />;
      }
      return <DashboardGrid main={dashboard.main} sub={dashboard.sub} records={dashboardRecords} />;
    }
    case "content":
      return (
        <Card as="section" className="p-6 flex flex-col gap-4">
          <h2 className="text-base font-semibold text-ink m-0">{entry.label}</h2>
          <p className="text-ink-soft m-0">{parameters.product.description ?? parameters.product.tagline}</p>
        </Card>
      );
    case "collection":
    default:
      return <CollectionView entity={entity} searchEnabled />;
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
    </AppShell>
  );
}
