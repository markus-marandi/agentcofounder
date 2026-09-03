import type { PlotSpec, StoredRecord } from "../kernel/types.js";
import { isIllustrative, pointsForPlot } from "../mock/generators.js";
import { Badge } from "./Badge.js";
import { Card } from "./Card.js";
import { Chart } from "./Chart.js";
import { ErrorBoundary } from "./ErrorBoundary.js";

function Plot({ plot, records, main }: { plot: PlotSpec; records: StoredRecord[]; main?: boolean }) {
  return (
    <Card
      as="section"
      className={`p-6${main ? " sm:col-span-2 lg:col-span-4" : ""}`}
      aria-labelledby={`plot-${plot.id}`}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink m-0 mb-2" id={`plot-${plot.id}`}>
        {plot.title}
        {main ? <Badge tone="accent">Headline</Badge> : null}
      </h3>
      <ErrorBoundary label={plot.title}>
        <Chart kind={plot.kind} points={pointsForPlot(plot, records)} title={plot.title} unit={plot.unit} />
      </ErrorBoundary>
      {isIllustrative(plot) ? (
        <p className="text-xs text-ink-soft mt-2 mb-0">Sample figures, shown to illustrate the layout.</p>
      ) : null}
    </Card>
  );
}

/** One headline plot above four supporting plots. */
export function DashboardGrid({
  main,
  sub,
  records,
}: {
  main: PlotSpec;
  sub: PlotSpec[];
  records: StoredRecord[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Plot plot={main} records={records} main />
      {sub.map((plot) => (
        <Plot key={plot.id} plot={plot} records={records} />
      ))}
    </div>
  );
}
