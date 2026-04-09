import { Panel } from "../../../components/shell";
import { requireProfile } from "../../../lib/auth";
import { updateProfileAction, updateProfilePasswordAction } from "../../actions";

export default async function ProfilePage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  const profile = await requireProfile(["bank_admin", "bank_developer"]);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Profile Details" description="Manage the operator identity shown across audit logs and invites.">
        <form action={updateProfileAction} className="space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="full_name" placeholder="Full name" defaultValue={profile.full_name || ""} />
          <input className="w-full rounded-2xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 text-[var(--muted)]" value={profile.email} disabled readOnly />
          <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white">Save profile</button>
        </form>
      </Panel>
      <Panel title="Password" description="Rotate your dashboard password without leaving the current session.">
        <form action={updateProfilePasswordAction} className="space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="password" type="password" placeholder="New password" />
          <button className="rounded-2xl border border-[var(--line)] px-4 py-3">Update password</button>
        </form>
      </Panel>
      {(searchParams?.success || searchParams?.error) ? (
        <Panel title="Status">
          {searchParams?.success ? <p className="text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
          {searchParams?.error ? <p className="text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
        </Panel>
      ) : null}
    </div>
  );
}
