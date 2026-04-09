import Link from "next/link";

import { Panel } from "../../../components/shell";
import { createClient } from "../../../lib/supabase/server";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, plan, status, api_call_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <Panel title="Organizations" description="All client banks and fintechs across the platform.">
      <div className="mb-4 flex justify-end">
        <Link href="/admin/organizations/new" className="rounded-full bg-[var(--teal)] px-5 py-2 text-sm text-white">Create organization</Link>
      </div>
      <div className="overflow-hidden rounded-3xl border border-[var(--line)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--mint)]">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">API calls</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {(orgs || []).map((org) => (
              <tr key={org.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{org.name}</td>
                <td className="px-4 py-3 capitalize">{org.plan}</td>
                <td className="px-4 py-3 capitalize">{org.status}</td>
                <td className="px-4 py-3">{org.api_call_count.toLocaleString()}</td>
                <td className="px-4 py-3">{new Date(org.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
