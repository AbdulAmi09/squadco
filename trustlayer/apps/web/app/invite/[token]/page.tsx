import Link from "next/link";

import { acceptInviteAction } from "../../actions";

async function getInvite(token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const response = await fetch(`${apiUrl}/public/invitations/${token}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return null;
  }

  const body = await response.json();
  return body.data as {
    email: string;
    role: string;
    organization_name: string;
  };
}

export default async function InvitePage({
  params,
  searchParams
}: {
  params: { token: string };
  searchParams?: { error?: string; success?: string };
}) {
  const invite = await getInvite(params.token);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-panel">
        {!invite ? (
          <div>
            <h1 className="text-4xl font-semibold">Invite unavailable</h1>
            <p className="mt-4 text-sm text-[var(--muted)]">This invite is invalid, expired, or already used.</p>
            <Link href="/login" className="mt-6 inline-block rounded-full bg-[var(--ink)] px-5 py-3 text-sm text-white">Back to login</Link>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.35em] text-[var(--teal)]">Invitation</p>
            <h1 className="mt-4 text-5xl font-semibold">Join {invite.organization_name}</h1>
            <p className="mt-4 text-sm text-[var(--muted)]">
              You were invited as a {invite.role}. This creates your dashboard account directly through TrustLayer.
            </p>
            <form action={acceptInviteAction} className="mt-8 grid gap-4 md:max-w-xl">
              <input type="hidden" name="token" value={params.token} />
              <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" value={invite.email} disabled />
              <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Full name" name="full_name" />
              <input className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Create password" type="password" name="password" />
              <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white" type="submit">Accept invite</button>
            </form>
            {searchParams?.success ? <p className="mt-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
            {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
          </>
        )}
      </div>
    </main>
  );
}
