import Link from "next/link";

import { forgotPasswordAction } from "../../actions";

export default function ForgotPasswordPage({
  searchParams
}: {
  searchParams?: { success?: string; error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-panel">
        <h1 className="text-4xl font-semibold">Forgot password</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">Enter your email and TrustLayer will send a reset link.</p>
        <form action={forgotPasswordAction} className="mt-6 space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="email" placeholder="Email" />
          <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white">Send reset email</button>
        </form>
        {searchParams?.success ? <p className="mt-4 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
        {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
        <Link href="/login" className="mt-6 inline-block text-sm text-[var(--teal)]">Back to login</Link>
      </div>
    </main>
  );
}
