import { Panel } from "../../../../components/shell";
import { createOrganizationAction } from "../../../actions";

export default function NewOrganizationPage({
  searchParams
}: {
  searchParams?: {
    error?: string;
  };
}) {
  return (
    <Panel title="Create Organization" description="Provision a new bank org and generate an initial bank admin invite.">
      <form action={createOrganizationAction} className="grid gap-4 md:grid-cols-2">
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Organization name" name="name" />
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Slug" name="slug" />
        <select className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="plan">
          <option>starter</option>
          <option>growth</option>
          <option>enterprise</option>
        </select>
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Initial admin email" name="admin_email" />
        <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white md:col-span-2">Create org and invite admin</button>
        {searchParams?.error ? (
          <p className="text-sm text-[var(--coral)] md:col-span-2">{decodeURIComponent(searchParams.error)}</p>
        ) : null}
      </form>
    </Panel>
  );
}
