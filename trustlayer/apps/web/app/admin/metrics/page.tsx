import { DistributionGrid, TrendBars } from "../../../components/charts";
import { Panel } from "../../../components/shell";
import { getAdminOverviewData } from "../../../lib/queries";

export default async function AdminMetricsPage() {
  const overview = await getAdminOverviewData();

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="API Calls Over Time">
        <TrendBars data={overview.transactionSeries} tone="teal" />
      </Panel>
      <Panel title="Decision Distribution">
        <DistributionGrid values={overview.decisionCounts} />
      </Panel>
      <Panel title="Trust Score Bands">
        <DistributionGrid values={overview.trustBands} />
      </Panel>
      <Panel title="Credit Score Bands">
        <DistributionGrid values={overview.creditBands} />
      </Panel>
    </div>
  );
}
