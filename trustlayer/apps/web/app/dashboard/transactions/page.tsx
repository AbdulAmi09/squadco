import Link from "next/link";

import { Panel } from "../../../components/shell";
import { createClient } from "../../../lib/supabase/server";
import { nairaFromKobo } from "../../../lib/utils";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, amount, decision, risk_score, channel, location, customer_id")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <Panel title="Transactions" description="Filterable stream of analyzed transactions with decision and risk context.">
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Date range" />
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Decision" />
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Risk score range" />
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Channel" />
      </div>
      <div className="space-y-3">
        {(transactions || []).map((tx) => (
          <Link key={tx.id} href={`/dashboard/transactions/${tx.id}` as never} className="grid gap-3 rounded-3xl border border-[var(--line)] bg-white p-5 transition hover:border-[var(--teal)] md:grid-cols-6">
            <div><p className="text-xs text-[var(--muted)]">Transaction</p><p className="mt-1 font-semibold">{tx.id}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Customer</p><p className="mt-1 font-semibold">{tx.customer_id}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Amount</p><p className="mt-1 font-semibold">{nairaFromKobo(Number(tx.amount))}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Decision</p><p className="mt-1 font-semibold capitalize">{tx.decision || "pending"}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Risk score</p><p className="mt-1 font-semibold">{tx.risk_score ?? 0}</p></div>
            <div><p className="text-xs text-[var(--muted)]">Context</p><p className="mt-1 font-semibold">{tx.channel || "-"} / {tx.location || "-"}</p></div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}
