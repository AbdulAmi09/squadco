import { Panel } from "../../../components/shell";
import { requestGoLiveAction, updateBillingSettingsAction } from "../../actions";
import { callInternalApi } from "../../../lib/internal-api";

type BillingPayload = {
  org: {
    name: string;
    plan: string;
    apiCallCount: number;
    monthlyLimit: number;
  } | null;
  events: Array<{
    id: string;
    eventType: string;
    amountKobo: bigint | number | string;
    status: string;
    createdAt: string;
  }>;
  settings: null | {
    failOpenMode: string;
    squadEnabled: boolean;
    preferredAssistantName: string | null;
    preferredGreeting: string | null;
    liveEnabled: boolean;
  };
  goLiveRequests?: Array<{
    id: string;
    status: string;
    companyName: string;
    createdAt: string;
  }>;
};

export default async function BillingPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const billing = await callInternalApi<BillingPayload>("/billing", { method: "GET" });
  const usagePercent = billing.org ? Math.min(100, Math.round((billing.org.apiCallCount / Math.max(billing.org.monthlyLimit, 1)) * 100)) : 0;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Plan & Usage">
        <div className="space-y-3 text-sm">
          <p>Organization: {billing.org?.name || "-"}</p>
          <p>Plan: {billing.org?.plan || "-"}</p>
          <p>Usage: {billing.org?.apiCallCount || 0} / {billing.org?.monthlyLimit || 0}</p>
          <div className="h-3 rounded-full bg-white">
            <div className="h-3 rounded-full bg-[var(--teal)]" style={{ width: `${usagePercent}%` }} />
          </div>
        </div>
      </Panel>
      <Panel title="Runtime Settings">
        <form action={updateBillingSettingsAction} className="space-y-4">
          <select className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="fail_open_mode" defaultValue={billing.settings?.failOpenMode || "verify"}>
            <option value="verify">verify on AI failure</option>
            <option value="allow">allow on AI failure</option>
          </select>
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="preferred_assistant_name" placeholder="Assistant name" defaultValue={billing.settings?.preferredAssistantName || ""} />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="preferred_greeting" placeholder="Assistant greeting" defaultValue={billing.settings?.preferredGreeting || ""} />
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="squad_enabled" defaultChecked={billing.settings?.squadEnabled || false} /> Enable Squad integration</label>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="live_enabled" defaultChecked={billing.settings?.liveEnabled || false} /> Live mode approved</label>
          <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white">Save settings</button>
        </form>
        {searchParams?.success ? <p className="mt-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
      </Panel>
      <Panel title="Billing Events">
        <div className="space-y-3">
          {billing.events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
              {event.eventType} - NGN {Math.round(Number(event.amountKobo) / 100).toLocaleString()} - {event.status}
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Go Live">
        <form action={requestGoLiveAction} className="space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="company_name" placeholder="Registered company name" defaultValue={billing.org?.name || ""} />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="rc_number" placeholder="RC number" />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="bank_name" placeholder="Settlement bank" />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="account_name" placeholder="Account name" />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="account_number" placeholder="Account number" />
          <textarea className="min-h-32 w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="use_case_description" placeholder="Describe your real production use case and expected traffic." />
          <button className="rounded-2xl bg-[var(--teal)] px-4 py-3 text-white">Submit go-live request</button>
        </form>
      </Panel>
    </div>
  );
}
