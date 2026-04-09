import { disableTotpAction, enableTotpAction, verifyTotpAction } from "../../actions";
import { getCurrentProfile } from "../../../lib/auth";
import { callInternalApi } from "../../../lib/internal-api";

type TotpPayload = {
  enabled: boolean;
  secret: string | null;
  otpauth_url: string | null;
};

export default async function TwoFactorPage({
  searchParams
}: {
  searchParams?: { challenge?: string; next?: string; error?: string; success?: string };
}) {
  const profile = await getCurrentProfile();
  const next = searchParams?.next || (profile?.role === "super_admin" ? "/admin" : "/dashboard");
  const challengeMode = searchParams?.challenge === "1";
  const setup = profile ? await callInternalApi<TotpPayload>("/auth/2fa", { method: "GET" }) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[32px] border border-[var(--line)] bg-[var(--panel)] p-8 shadow-panel">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Account security</p>
          <h1 className="mt-4 text-4xl font-semibold">Two-factor authentication</h1>
          <p className="mt-3 max-w-xl text-sm text-[var(--muted)]">
            Use any authenticator app to scan the OTP URI or enter the secret manually. After setup, every new session must pass a 6-digit challenge before dashboard access.
          </p>
          {searchParams?.success ? <p className="mt-6 text-sm text-[var(--teal)]">{decodeURIComponent(searchParams.success)}</p> : null}
          {searchParams?.error ? <p className="mt-6 text-sm text-[var(--coral)]">{decodeURIComponent(searchParams.error)}</p> : null}

          {challengeMode ? (
            <form action={verifyTotpAction} className="mt-8 space-y-4">
              <input type="hidden" name="next" value={next} />
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                name="code"
                placeholder="Enter 6-digit authenticator code"
                inputMode="numeric"
              />
              <button className="rounded-2xl bg-[var(--ink)] px-5 py-3 text-white">Verify and continue</button>
            </form>
          ) : (
            <form action={enableTotpAction} className="mt-8 space-y-4">
              <input type="hidden" name="secret" value={setup?.secret || ""} />
              <input type="hidden" name="next" value={next} />
              <div className="rounded-3xl border border-[var(--line)] bg-white p-5 text-sm">
                <p className="font-medium">Manual setup secret</p>
                <p className="mt-2 break-all font-mono text-xs text-[var(--muted)]">{setup?.secret || "Unavailable"}</p>
                {setup?.otpauth_url ? <p className="mt-3 break-all text-xs text-[var(--muted)]">{setup.otpauth_url}</p> : null}
              </div>
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                name="code"
                placeholder="Enter the first 6-digit code to enable 2FA"
                inputMode="numeric"
              />
              <button className="rounded-2xl bg-[var(--teal)] px-5 py-3 text-white">Enable two-factor authentication</button>
            </form>
          )}
        </div>

        <div className="rounded-[32px] border border-[var(--line)] bg-white p-8">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--muted)]">Status</p>
          <p className="mt-4 text-3xl font-semibold">{setup?.enabled ? "Enabled" : "Not enabled"}</p>
          <p className="mt-3 text-sm text-[var(--muted)]">
            {setup?.enabled
              ? "Two-factor authentication is active on this account. Use a fresh authenticator code to disable it."
              : "Enable it now to protect admin and developer actions, API key access, and billing changes."}
          </p>

          {setup?.enabled ? (
            <form action={disableTotpAction} className="mt-8 space-y-4">
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
                name="code"
                placeholder="Authenticator code to disable"
                inputMode="numeric"
              />
              <button className="rounded-2xl border border-[var(--line)] px-5 py-3">Disable 2FA</button>
            </form>
          ) : null}

          <div className="mt-8 text-sm text-[var(--muted)]">
            <a href={next} className="underline underline-offset-4">Back to dashboard</a>
          </div>
        </div>
      </div>
    </main>
  );
}
