import { ReactNode } from "react";

import { AppShell } from "../../components/shell";
import { requireProfile } from "../../lib/auth";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/organizations/new", label: "New Org" },
  { href: "/admin/metrics", label: "Metrics" },
  { href: "/admin/logs", label: "Audit Logs" },
  { href: "/admin/ops", label: "Ops" }
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile(["super_admin"]);

  return (
    <AppShell
      title="Super Admin"
      subtitle="Platform-wide control plane for orgs, plans, risk load, and audit activity."
      links={links}
      profile={{
        fullName: profile.full_name,
        email: profile.email,
        organization: profile.organization?.name || "TrustLayer",
        role: profile.role
      }}
    >
      {children}
    </AppShell>
  );
}
