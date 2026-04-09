import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "../lib/auth";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  if (profile) {
    redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.35em] text-[var(--teal)]">Trust Infrastructure</p>
        <h1 className="mt-6 text-6xl font-semibold leading-tight">
          TrustLayer AI gives banks a programmable security and intelligence layer.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--muted)]">
          Analyze transactions, score trust and credit, issue API keys, embed a customer-facing assistant, and monitor every decision from one multi-tenant control plane.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/admin" className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm text-white">Open Super Admin</Link>
          <Link href="/dashboard" className="rounded-full bg-[var(--teal)] px-6 py-3 text-sm text-white">Open Bank Dashboard</Link>
          <Link href="/login" className="rounded-full border border-[var(--line)] px-6 py-3 text-sm">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
