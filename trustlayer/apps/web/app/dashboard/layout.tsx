import { ReactNode } from "react";

import { AppShell } from "../../components/shell";
import { requireProfile } from "../../lib/auth";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/transactions", label: "Transactions" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/team", label: "Team" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/api-keys", label: "API Keys" },
  { href: "/dashboard/docs", label: "Docs" },
  { href: "/dashboard/playground", label: "Playground" },
  { href: "/dashboard/sdk", label: "SDK" }
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile(["bank_admin", "bank_developer"]);

  return (
    <AppShell
      title="Bank Dashboard"
      subtitle="Tenant-scoped operations for risk monitoring, customers, integrations, and developer tooling."
      links={links}
      profile={{
        fullName: profile.full_name,
        email: profile.email,
        organization: profile.organization?.name || null,
        role: profile.role
      }}
    >
      {children}
    </AppShell>
  );
}
