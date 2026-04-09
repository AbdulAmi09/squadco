import Link from "next/link";

import { Panel } from "../../../components/shell";
import { createClient } from "../../../lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("bank_customers")
    .select("id, external_id, trust_score, credit_score, risk_tier, total_transactions")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Panel title="Customers" description="Tenant-scoped profiles with trust history, credit breakdown, and recent activity.">
      <div className="space-y-3">
        {(customers || []).map((customer) => (
          <Link key={customer.id} href={`/dashboard/customers/${customer.id}`} className="grid gap-3 rounded-3xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--teal)] md:grid-cols-5">
            <div><p className="text-xs text-[var(--muted)]">External ID</p><p className="mt-1 font-semibold">{customer.external_id}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Trust score</p><p className="mt-1 font-semibold">{customer.trust_score}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Credit score</p><p className="mt-1 font-semibold">{customer.credit_score}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Tier</p><p className="mt-1 font-semibold capitalize">{customer.risk_tier}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Transactions</p><p className="mt-1 font-semibold">{customer.total_transactions}</p></div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
