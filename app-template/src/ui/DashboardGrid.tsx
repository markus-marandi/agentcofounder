import type { PlotSpec, StoredRecord } from "../kernel/types.js";
import { isIllustrative, pointsForPlot } from "../mock/generators.js";
import { Chart } from "./Chart.js";
import { ErrorBoundary } from "./ErrorBoundary.js";

function Plot({ plot, records, main }: { plot: PlotSpec; records: StoredRecord[]; main?: boolean }) {
  return (
    <section className={`chart-frame${main ? " dashboard-main" : ""}`} aria-labelledby={`plot-${plot.id}`}>
      <h3 className="chart-title" id={`plot-${plot.id}`}>
        {plot.title}
      </h3>
      <ErrorBoundary label={plot.title}>
        <Chart kind={plot.kind} points={pointsForPlot(plot, records)} title={plot.title} unit={plot.unit} />
      </ErrorBoundary>
      {isIllustrative(plot) ? (
        <p className="muted" style={{ fontSize: "0.78rem", margin: "0.5rem 0 0" }}>
          Sample figures, shown to illustrate the layout.
        </p>
      ) : null}
    </section>
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
    <div className="dashboard-grid">
      <Plot plot={main} records={records} main />
      {sub.map((plot) => (
        <Plot key={plot.id} plot={plot} records={records} />
      ))}
    </div>
  );
}
