import { resendVerificationAction } from "../../actions";

export default function VerifyEmailPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-panel">
        <h1 className="text-4xl font-semibold">Verify your email</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Resend a verification email if you did not receive one.</p>
        <form action={resendVerificationAction} className="mt-6 space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="email" placeholder="Email" />
          <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white">Resend verification</button>
        </form>
        {searchParams?.success ? <p className="mt-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
      </div>
    </main>
  );
}
