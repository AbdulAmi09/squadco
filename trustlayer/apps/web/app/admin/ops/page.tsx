import { Panel } from "../../../components/shell";
import { retryFailedJobAction } from "../../actions";
import { callInternalApi } from "../../../lib/internal-api";

type OpsPayload = {
  failedJobs: Array<{
    id: string;
    jobType: string;
    errorMessage: string;
    retryCount: number;
    createdAt: string;
  }>;
  backgroundJobs: Array<{
    id: string;
    jobType: string;
    status: string;
    priority: string;
    createdAt: string;
  }>;
};

export default async function AdminOpsPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const ops = await callInternalApi<OpsPayload>("/admin/failed-jobs", { method: "GET" });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Failed Jobs">
        {searchParams?.success ? <p className="mb-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mb-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
        <div className="space-y-3">
          {ops.failedJobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
              <p className="font-semibold">{job.jobType}</p>
              <p className="mt-1 text-[var(--muted)]">{job.errorMessage}</p>
              <form action={retryFailedJobAction} className="mt-3">
                <input type="hidden" name="id" value={job.id} />
                <button className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em]">Retry</button>
              </form>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Queued Jobs">
        <div className="space-y-3">
          {ops.backgroundJobs.map((job) => (
            <div key={job.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
              {job.jobType} - {job.status} - {job.priority}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
