import Link from "next/link";
import { ReactNode } from "react";

import { cn } from "../lib/utils";
import { signOutAction } from "../app/actions";

export function AppShell({
  title,
  subtitle,
  links,
  profile,
  children
}: {
  title: string;
  subtitle: string;
  links: Array<{ href: string; label: string }>;
  profile?: {
    fullName?: string | null;
    email?: string | null;
    organization?: string | null;
    role?: string | null;
  };
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-panel backdrop-blur">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">TrustLayer AI</p>
            <h1 className="mt-3 text-3xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">{subtitle}</p>
          </div>
          {profile ? (
            <div className="mb-6 rounded-3xl border border-[var(--line)] bg-white px-4 py-4 text-sm">
              <p className="font-semibold">{profile.fullName || profile.email}</p>
              <p className="mt-1 text-[var(--muted)]">{profile.organization || profile.role}</p>
              <form action={signOutAction} className="mt-4">
                <button className="rounded-full border border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.2em]">
                  Sign out
                </button>
              </form>
            </div>
          ) : null}
          <nav className="space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href as never}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-sm transition",
                  "hover:bg-[var(--mint)] hover:text-[var(--teal)]"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}

export function StatGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-panel">
          <p className="text-sm text-[var(--muted)]">{item.label}</p>
          <p className="mt-4 text-4xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function Panel({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-panel">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
