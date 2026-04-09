import { Panel } from "../../../components/shell";
import Link from "next/link";
import { createWebhookAction } from "../../actions";
import { testWebhookAction } from "../../actions";
import { requireProfile } from "../../../lib/auth";
import { createClient } from "../../../lib/supabase/server";

export default async function SettingsPage({
  searchParams
}: {
  searchParams?: {
    success?: string;
    error?: string;
  };
}) {
  const profile = await requireProfile(["bank_admin", "bank_developer"]);
  const supabase = await createClient();
  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, events, is_active")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Webhook Settings">
        <form action={createWebhookAction} className="space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="https://bank.example.com/webhooks/trustlayer" name="url" />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="transaction.analyzed, score.updated" name="events" />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Webhook secret" name="secret" />
          <button className="rounded-2xl bg-[var(--teal)] px-5 py-3 text-white">Save webhook</button>
        </form>
        {searchParams?.success ? <p className="mt-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
        <div className="mt-4 space-y-4">
          {(webhooks || []).map((webhook) => (
            <div key={webhook.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
              <p>{webhook.url} - {webhook.is_active ? "active" : "inactive"} - {webhook.events.join(", ")}</p>
              <form action={testWebhookAction} className="mt-3">
                <input type="hidden" name="id" value={webhook.id} />
                <button className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em]" disabled={!webhook.is_active}>
                  Send test
                </button>
              </form>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Plan Details">
        <div className="space-y-3 text-sm">
          <p>Current plan: {profile.organization?.plan || "-"}</p>
          <p>Organization: {profile.organization?.name || "-"}</p>
          <p>Status: {profile.organization?.status || "-"}</p>
          <Link href="/2fa" className="inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em]">
            Manage 2FA
          </Link>
        </div>
      </Panel>
    </div>
  );
}
