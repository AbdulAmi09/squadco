import { Panel } from "../../../components/shell";
import { createClient } from "../../../lib/supabase/server";

export default async function AdminLogsPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, action, resource, created_at, metadata")
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <Panel title="Platform Audit Trail">
      <div className="space-y-3">
        {(logs || []).map((log) => (
          <div key={log.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
            <p className="font-semibold">{log.action}</p>
            <p className="mt-1 text-[var(--muted)]">{log.resource || "resource unavailable"}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{new Date(log.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
