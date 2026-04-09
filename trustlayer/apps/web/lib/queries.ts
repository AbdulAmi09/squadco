import { createClient } from "./supabase/server";
import type { DashboardProfile } from "./auth";

function aggregateByDay(
  timestamps: string[],
  days: number
) {
  const labels: string[] = [];
  const counts = new Map<string, number>();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    labels.push(key);
    counts.set(key, 0);
  }

  for (const timestamp of timestamps) {
    const key = new Date(timestamp).toISOString().slice(0, 10);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }

  return labels.map((label) => ({
    label,
    value: counts.get(label) || 0
  }));
}

function bandScore(score: number, type: "trust" | "credit") {
  if (type === "trust") {
    if (score <= 300) return "0-300";
    if (score <= 600) return "301-600";
    if (score <= 850) return "601-850";
    return "851-1000";
  }

  if (score <= 300) return "0-300";
  if (score <= 550) return "301-550";
  if (score <= 700) return "551-700";
  return "701-850";
}

export async function getAdminOverviewData() {
  const supabase = await createClient();

  const [{ count: orgCount }, { count: todayTransactions }, { count: flaggedTransactions }, { data: orgs }, { data: customers }, { data: transactions }] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from("transactions").select("*", { count: "exact", head: true }).in("decision", ["verify", "block"]),
    supabase.from("organizations").select("id, name, plan, status, api_call_count, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("bank_customers").select("trust_score, credit_score, risk_tier"),
    supabase.from("transactions").select("created_at, decision, risk_score").gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  const avgTrust = customers?.length ? Math.round(customers.reduce((sum, item) => sum + item.trust_score, 0) / customers.length) : 0;
  const avgCredit = customers?.length ? Math.round(customers.reduce((sum, item) => sum + item.credit_score, 0) / customers.length) : 0;
  const apiCalls = (orgs || []).reduce((sum, org) => sum + org.api_call_count, 0);
  const decisionCounts = (transactions || []).reduce<Record<string, number>>((acc, tx) => {
    const key = tx.decision || "pending";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const trustBands = (customers || []).reduce<Record<string, number>>((acc, customer) => {
    const key = bandScore(customer.trust_score, "trust");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const creditBands = (customers || []).reduce<Record<string, number>>((acc, customer) => {
    const key = bandScore(customer.credit_score, "credit");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    orgCount: orgCount || 0,
    todayTransactions: todayTransactions || 0,
    flaggedTransactions: flaggedTransactions || 0,
    apiCalls,
    avgTrust,
    avgCredit,
    recentOrgs: orgs || [],
    transactionSeries: aggregateByDay((transactions || []).map((item) => item.created_at), 14),
    decisionCounts,
    trustBands,
    creditBands
  };
}

export async function getBankOverviewData(profile: DashboardProfile) {
  const supabase = await createClient();
  const orgId = profile.org_id;

  const [{ count: customerCount }, { count: todayTransactions }, { count: flaggedTransactions }, { data: customers }, { data: recentTransactions }, { data: analyticsTransactions }] = await Promise.all([
    supabase.from("bank_customers").select("*", { count: "exact", head: true }),
    supabase.from("transactions").select("*", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from("transactions").select("*", { count: "exact", head: true }).in("decision", ["verify", "block"]),
    supabase.from("bank_customers").select("trust_score, credit_score"),
    supabase.from("transactions").select("id, amount, decision, risk_score, channel, location, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("transactions").select("created_at, decision, risk_score").gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  const avgTrust = customers?.length ? Math.round(customers.reduce((sum, item) => sum + item.trust_score, 0) / customers.length) : 0;
  const avgCredit = customers?.length ? Math.round(customers.reduce((sum, item) => sum + item.credit_score, 0) / customers.length) : 0;
  const riskQueue = (analyticsTransactions || []).reduce(
    (acc, tx) => {
      if (tx.decision === "verify") acc.verify += 1;
      if (tx.decision === "block") acc.block += 1;
      return acc;
    },
    { verify: 0, block: 0 }
  );

  return {
    orgId,
    customerCount: customerCount || 0,
    todayTransactions: todayTransactions || 0,
    flaggedTransactions: flaggedTransactions || 0,
    avgTrust,
    avgCredit,
    recentTransactions: recentTransactions || [],
    decisionSeries: aggregateByDay((analyticsTransactions || []).map((item) => item.created_at), 7),
    riskQueue,
    avgRiskScore: analyticsTransactions?.length
      ? Math.round(analyticsTransactions.reduce((sum, item) => sum + (item.risk_score || 0), 0) / analyticsTransactions.length)
      : 0
  };
}
