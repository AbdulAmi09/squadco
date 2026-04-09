import { Panel, StatGrid } from "../../components/shell";
import { reviewGoLiveAction, runMonthlyResetAction } from "../actions";
import { getAdminOverviewData } from "../../lib/queries";
import { callInternalApi } from "../../lib/internal-api";

type GoLiveRequest = {
  id: string;
  companyName: string;
  rcNumber: string | null;
  useCaseDescription: string | null;
  status: string;
  createdAt: string;
};

export default async function AdminOverviewPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const overview = await getAdminOverviewData();
  const goLiveRequests = await callInternalApi<GoLiveRequest[]>("/admin/go-live-requests", { method: "GET" });
  const adminStats = [
    { label: "Total orgs", value: String(overview.orgCount) },
    { label: "API calls", value: overview.apiCalls.toLocaleString() },
    { label: "Tx today", value: String(overview.todayTransactions) },
    { label: "Flagged tx", value: String(overview.flaggedTransactions) }
  ];

  return (
    <>
      <StatGrid items={adminStats} />
      <Panel title="Platform Pulse" description="Cross-tenant traffic, abnormal activity, and commercial health.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-[var(--mint)] p-5">
            <p className="text-sm text-[var(--muted)]">Average trust score</p>
            <p className="mt-3 text-3xl font-semibold">{overview.avgTrust}</p>
          </div>
          <div className="rounded-3xl bg-white p-5">
            <p className="text-sm text-[var(--muted)]">Average credit score</p>
            <p className="mt-3 text-3xl font-semibold">{overview.avgCredit}</p>
          </div>
          <div className="rounded-3xl bg-[var(--ink)] p-5 text-white">
            <p className="text-sm text-white/70">Recent organizations</p>
            <p className="mt-3 text-3xl font-semibold">{overview.recentOrgs.length}</p>
          </div>
        </div>
      </Panel>
      <Panel title="Go-Live Reviews" description="Approve or reject banks moving from sandbox to live mode.">
        {searchParams?.success ? <p className="mb-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mb-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
        <form action={runMonthlyResetAction} className="mb-6">
          <button className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em]">Run monthly usage reset</button>
        </form>
        <div className="space-y-4">
          {goLiveRequests.map((request) => (
            <div key={request.id} className="rounded-3xl border border-[var(--line)] bg-white p-5">
              <p className="text-sm font-medium">{request.companyName} · {request.status}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{request.useCaseDescription || "No use case description provided."}</p>
              <form action={reviewGoLiveAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
                <input type="hidden" name="id" value={request.id} />
                <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" name="review_notes" placeholder="Review notes" />
                <button className="rounded-2xl bg-[var(--teal)] px-4 py-3 text-white" name="action" value="approved">Approve</button>
                <button className="rounded-2xl border border-[var(--line)] px-4 py-3" name="action" value="rejected">Reject</button>
              </form>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
