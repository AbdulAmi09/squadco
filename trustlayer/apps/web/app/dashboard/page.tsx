import { TrendBars } from "../../components/charts";
import { Panel, StatGrid } from "../../components/shell";
import { requireProfile } from "../../lib/auth";
import { getBankOverviewData } from "../../lib/queries";
import { nairaFromKobo } from "../../lib/utils";

export default async function DashboardOverviewPage() {
  const profile = await requireProfile(["bank_admin", "bank_developer"]);
  const overview = await getBankOverviewData(profile);
  const bankStats = [
    { label: "Customers", value: String(overview.customerCount) },
    { label: "Transactions today", value: String(overview.todayTransactions) },
    { label: "Flagged count", value: String(overview.flaggedTransactions) },
    { label: "Avg trust score", value: String(overview.avgTrust) }
  ];

  return (
    <>
      <StatGrid items={bankStats} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Risk Queue" description="Flagged and verification-bound activity that needs operational attention.">
          <div className="space-y-3">
            <div className="rounded-3xl bg-[var(--mint)] p-5">
              <p className="text-sm text-[var(--muted)]">Verify required</p>
              <p className="mt-3 text-3xl font-semibold">{overview.riskQueue.verify}</p>
            </div>
            <div className="rounded-3xl bg-white p-5">
              <p className="text-sm text-[var(--muted)]">Blocked in last hour</p>
              <p className="mt-3 text-3xl font-semibold">{overview.riskQueue.block}</p>
            </div>
          </div>
        </Panel>
        <Panel title="Model Signals" description="Current trust and credit distribution for your portfolio.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-5">
              <p className="text-sm text-[var(--muted)]">Trusted or Elite</p>
              <p className="mt-3 text-3xl font-semibold">{overview.avgTrust >= 600 ? "Healthy" : "Needs work"}</p>
            </div>
            <div className="rounded-3xl bg-[#fff0ea] p-5">
              <p className="text-sm text-[var(--muted)]">Avg credit score</p>
              <p className="mt-3 text-3xl font-semibold">{overview.avgCredit}</p>
            </div>
            <div className="rounded-3xl bg-white p-5">
              <p className="text-sm text-[var(--muted)]">Average risk score</p>
              <p className="mt-3 text-3xl font-semibold">{overview.avgRiskScore}</p>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="7-Day Transaction Trend" description="Recent analyzed transaction volume across your tenant.">
        <TrendBars data={overview.decisionSeries} tone="ink" />
      </Panel>
      <Panel title="Recent Transactions" description="Latest analyzed activity in your organization.">
        <div className="space-y-3">
          {overview.recentTransactions.map((tx) => (
            <div key={tx.id} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm md:grid-cols-4">
              <span>{tx.id}</span>
              <span>{nairaFromKobo(Number(tx.amount))}</span>
              <span className="capitalize">{tx.decision || "pending"}</span>
              <span>{tx.risk_score ?? 0}/100</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
