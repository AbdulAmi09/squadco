import { Panel } from "../../../components/shell";
import { createApiKeyAction, revokeApiKeyAction } from "../../actions";
import { createClient } from "../../../lib/supabase/server";

export default async function ApiKeysPage({
  searchParams
}: {
  searchParams?: {
    success?: string;
    error?: string;
  };
}) {
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, key_prefix, environment, is_active, created_at, last_used_at, name")
    .order("created_at", { ascending: false });

  return (
    <Panel title="API Keys" description="Create sandbox or production credentials. Full key is shown once at creation.">
      <form action={createApiKeyAction} className="mb-6 grid gap-4 md:grid-cols-[2fr_1fr_auto]">
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Key name" name="name" />
        <select className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="environment">
          <option>sandbox</option>
          <option>production</option>
        </select>
        <button className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-white">Create key</button>
      </form>
      {searchParams?.success ? <p className="mb-4 text-sm text-[var(--teal)] break-all">{decodeURIComponent(searchParams.success)}</p> : null}
      {searchParams?.error ? <p className="mb-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
      <div className="space-y-3">
        {(keys || []).map((key) => (
          <div key={key.id} className="flex items-center justify-between rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
            <span>{key.name} - {key.key_prefix} - {key.environment}</span>
            <form action={revokeApiKeyAction}>
              <input type="hidden" name="id" value={key.id} />
              <button className="text-[var(--coral)]" disabled={!key.is_active}>{key.is_active ? "Revoke" : "Inactive"}</button>
            </form>
          </div>
        ))}
      </div>
    </Panel>
  );
}
