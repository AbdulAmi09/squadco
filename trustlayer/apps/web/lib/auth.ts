import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { createClient } from "./supabase/server";

export type DashboardProfile = {
  id: string;
  org_id: string | null;
  role: "super_admin" | "bank_admin" | "bank_developer";
  full_name: string | null;
  email: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  } | null;
  security?: {
    totp_enabled: boolean;
  } | null;
};

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return null;
  }

  const { data } = await supabase
    .from("users")
    .select(`
      id,
      org_id,
      role,
      full_name,
      email,
      user_security (
        totp_enabled
      ),
      organizations (
        id,
        name,
        slug,
        plan,
        status
      )
    `)
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    org_id: data.org_id ? String(data.org_id) : null,
    role: data.role as DashboardProfile["role"],
    full_name: data.full_name ? String(data.full_name) : null,
    email: String(data.email),
    security: Array.isArray(data.user_security)
      ? ((data.user_security[0] as DashboardProfile["security"]) || null)
      : ((data.user_security as DashboardProfile["security"]) || null),
    organization: Array.isArray(data.organizations)
      ? ((data.organizations[0] as DashboardProfile["organization"]) || null)
      : ((data.organizations as DashboardProfile["organization"]) || null)
  };
}

export async function requireProfile(roles?: DashboardProfile["role"][]) {
  const profile = await getCurrentProfile();
  const cookieStore = await cookies();

  if (!profile) {
    redirect("/login");
  }

  if (profile.security?.totp_enabled && cookieStore.get("tl_2fa_verified")?.value !== "1") {
    redirect(`/2fa?challenge=1&next=${encodeURIComponent(profile.role === "super_admin" ? "/admin" : "/dashboard")}`);
  }

  if (roles && !roles.includes(profile.role)) {
    redirect(profile.role === "super_admin" ? "/admin" : "/dashboard");
  }

  return profile;
}
