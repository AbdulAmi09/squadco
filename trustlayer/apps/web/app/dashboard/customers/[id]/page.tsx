import { Panel } from "../../../../components/shell";
import { callInternalApi } from "../../../../lib/internal-api";
import { nairaFromKobo } from "../../../../lib/utils";
import { uploadStatementAction } from "../../../actions";

type CustomerDetail = {
  id: string;
  externalId: string;
  trustScore: number;
  creditScore: number;
  riskTier: string;
  totalTransactions: number;
  flaggedTransactions: number;
  trustHistory: Array<{
    id: string;
    changeAmount: number;
    oldScore: number;
    newScore: number;
    reason: string;
    createdAt: string;
  }>;
  transactions: Array<{
    id: string;
    amount: number | string;
    decision: string | null;
    riskScore: number | null;
    merchant: string | null;
    createdAt: string;
  }>;
  creditSummary: null | {
    credit_score: number;
    rating: string;
    breakdown: Record<string, number>;
    loan_eligibility: string;
  };
};

export default async function CustomerDetailPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams?: { success?: string; error?: string };
}) {
  const customer = await callInternalApi<CustomerDetail>(`/customers/${params.id}`, {
    method: "GET"
  });

  return (
    <div className="space-y-6">
      <Panel title={`Customer ${customer.externalId}`} description="Trust history, credit view, transaction trail, and statement upload.">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Trust score</p>
            <p className="mt-3 text-3xl font-semibold">{customer.trustScore}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Credit score</p>
            <p className="mt-3 text-3xl font-semibold">{customer.creditScore}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Risk tier</p>
            <p className="mt-3 text-3xl font-semibold capitalize">{customer.riskTier}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Flagged tx</p>
            <p className="mt-3 text-3xl font-semibold">{customer.flaggedTransactions}</p>
          </div>
        </div>
        {searchParams?.success ? <p className="mt-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Trust Score History">
          <div className="space-y-3">
            {customer.trustHistory.map((item) => (
              <div key={item.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
                <p className="font-semibold">{item.reason}</p>
                <p className="mt-1 text-[var(--muted)]">{item.oldScore} to {item.newScore} ({item.changeAmount >= 0 ? "+" : ""}{item.changeAmount})</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Credit Breakdown">
          {customer.creditSummary ? (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white px-4 py-4">
                <p className="text-sm text-[var(--muted)]">Rating</p>
                <p className="mt-2 text-2xl font-semibold">{customer.creditSummary.rating}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">{customer.creditSummary.loan_eligibility}</p>
              </div>
              {Object.entries(customer.creditSummary.breakdown).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="capitalize">{key.replace(/_/g, " ")}</span>
                    <span className="font-semibold">{value}/100</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No credit inputs yet. Upload a statement to start building a profile.</p>
          )}
        </Panel>
      </div>

      <Panel title="Upload Statement" description="Send PDF or CSV bank statements through the dashboard API to the hosted AI engine.">
        <form action={uploadStatementAction} className="grid gap-4 md:grid-cols-[1fr_180px_auto]">
          <input type="hidden" name="customer_id" value={customer.id} />
          <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="statement" type="file" accept=".pdf,.csv" />
          <select className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="file_type" defaultValue="pdf">
            <option value="pdf">pdf</option>
            <option value="csv">csv</option>
          </select>
          <button className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-white">Upload</button>
        </form>
      </Panel>

      <Panel title="Transaction History">
        <div className="space-y-3">
          {customer.transactions.map((tx) => (
            <div key={tx.id} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm md:grid-cols-4">
              <span>{tx.merchant || tx.id}</span>
              <span>{nairaFromKobo(Number(tx.amount))}</span>
              <span className="capitalize">{tx.decision || "pending"}</span>
              <span>{tx.riskScore ?? 0}/100</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
