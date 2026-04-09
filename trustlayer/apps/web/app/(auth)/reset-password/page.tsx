import { updatePasswordAction } from "../../actions";

export default function ResetPasswordPage({
  searchParams
}: {
  searchParams?: { error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-panel">
        <h1 className="text-4xl font-semibold">Reset password</h1>
        <form action={updatePasswordAction} className="mt-6 space-y-4">
          <input className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" name="password" type="password" placeholder="New password" />
          <button className="rounded-2xl bg-[var(--ink)] px-4 py-3 text-white">Update password</button>
        </form>
        {searchParams?.error ? <p className="mt-4 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}
      </div>
    </main>
  );
}
