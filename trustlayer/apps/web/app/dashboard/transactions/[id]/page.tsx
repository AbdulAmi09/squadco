import { Panel } from "../../../../components/shell";
import { callInternalApi } from "../../../../lib/internal-api";
import { nairaFromKobo } from "../../../../lib/utils";

type TransactionDetail = {
  id: string;
  amount: number | string;
  currency: string;
  merchant: string | null;
  location: string | null;
  deviceId: string | null;
  ipAddress: string | null;
  channel: string | null;
  riskScore: number | null;
  riskFactors: Array<Record<string, unknown>>;
  decision: string | null;
  aiExplanation: string | null;
  status: string;
  createdAt: string;
  customer: null | {
    id: string;
    externalId: string;
    trustScore: number;
    creditScore: number;
    riskTier: string;
    totalTransactions: number;
    flaggedTransactions: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number | string;
    decision: string | null;
    riskScore: number | null;
    createdAt: string;
  }>;
};

export default async function TransactionDetailPage({
  params
}: {
  params: { id: string };
}) {
  const tx = await callInternalApi<TransactionDetail>(`/transactions/${params.id}`, { method: "GET" });

  return (
    <div className="space-y-6">
      <Panel title={`Transaction ${tx.id}`} description="Full risk breakdown, AI explanation, and customer snapshot.">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Amount</p>
            <p className="mt-3 text-3xl font-semibold">{nairaFromKobo(Number(tx.amount))}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Decision</p>
            <p className="mt-3 text-3xl font-semibold capitalize">{tx.decision || "pending"}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Risk score</p>
            <p className="mt-3 text-3xl font-semibold">{tx.riskScore ?? 0}/100</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Status</p>
            <p className="mt-3 text-3xl font-semibold capitalize">{tx.status}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Risk Factors">
          <div className="space-y-3">
            {(tx.riskFactors || []).map((factor, index) => (
              <div key={`${tx.id}-factor-${index}`} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
                <p className="font-semibold capitalize">{String(factor.type || "risk factor").replace(/_/g, " ")}</p>
                <pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-[var(--muted)]">{JSON.stringify(factor, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="AI Explanation">
          <div className="rounded-2xl bg-white px-4 py-4 text-sm">
            {tx.aiExplanation || "No explanation generated."}
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Merchant: {tx.merchant || "-"}</div>
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Location: {tx.location || "-"}</div>
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Channel: {tx.channel || "-"}</div>
            <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Device: {tx.deviceId || "-"}</div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Customer Snapshot">
          {tx.customer ? (
            <div className="grid gap-3 text-sm">
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">External ID: {tx.customer.externalId}</div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Trust score: {tx.customer.trustScore}</div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Credit score: {tx.customer.creditScore}</div>
              <div className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4">Risk tier: {tx.customer.riskTier}</div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No customer data available.</p>
          )}
        </Panel>

        <Panel title="Recent Customer Transactions">
          <div className="space-y-3">
            {tx.recentTransactions.map((item) => (
              <div key={item.id} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm md:grid-cols-4">
                <span>{item.id}</span>
                <span>{nairaFromKobo(Number(item.amount))}</span>
                <span className="capitalize">{item.decision || "pending"}</span>
                <span>{item.riskScore ?? 0}/100</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
