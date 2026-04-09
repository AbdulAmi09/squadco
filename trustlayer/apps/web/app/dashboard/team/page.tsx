import { Panel } from "../../../components/shell";
import { inviteTeamMemberAction } from "../../actions";
import { createClient } from "../../../lib/supabase/server";

export default async function TeamPage({
  searchParams
}: {
  searchParams?: {
    success?: string;
    error?: string;
  };
}) {
  const supabase = await createClient();
  const [{ data: users }, { data: invites }] = await Promise.all([
    supabase.from("users").select("id, full_name, email, role").order("created_at", { ascending: false }),
    supabase.from("invitations").select("id, email, role, created_at, accepted_at").order("created_at", { ascending: false })
  ]);

  return (
    <Panel title="Team Access" description="Invite and manage bank admins and developers within your organization.">
      <form action={inviteTeamMemberAction} className="mb-6 grid gap-4 md:grid-cols-[2fr_1fr_auto]">
        <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="teammate@bank.com" name="email" />
        <select className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="role">
          <option>bank_admin</option>
          <option>bank_developer</option>
        </select>
        <button className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-white">Send invite</button>
      </form>
      {searchParams?.success ? <p className="mb-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
      {searchParams?.error ? <p className="mb-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
      <div className="space-y-3">
        {(users || []).map((member) => (
          <div key={member.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
            {(member.full_name || member.email)} - {member.role}
          </div>
        ))}
        {(invites || []).map((invite) => (
          <div key={invite.id} className="rounded-2xl border border-[var(--line)] bg-[#fff8f4] px-4 py-4 text-sm">
            Invite pending: {invite.email} - {invite.role} - {invite.accepted_at ? "accepted" : "pending"}
          </div>
        ))}
      </div>
    </Panel>
  );
}
