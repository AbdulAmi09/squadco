export type Role = "super_admin" | "bank_admin" | "bank_developer";

export const demoSession = {
  fullName: "TrustLayer Operator",
  organization: "Demo Bank",
  role: "bank_admin" as Role
};

export const adminStats = [
  { label: "Total orgs", value: "42" },
  { label: "API calls today", value: "1.2M" },
  { label: "Revenue", value: "₦18.4M" },
  { label: "Flagged tx", value: "9,284" }
];

export const bankStats = [
  { label: "Customers", value: "18,204" },
  { label: "Transactions today", value: "8,912" },
  { label: "Flagged count", value: "131" },
  { label: "Avg trust score", value: "672" }
];

export const sampleTransactions = [
  { id: "tx_001", customer: "demo_customer_001", amount: "₦250,000", decision: "allow", risk: 18, channel: "mobile", location: "Lagos" },
  { id: "tx_002", customer: "demo_customer_015", amount: "₦1,200,000", decision: "block", risk: 69, channel: "mobile", location: "Abuja" },
  { id: "tx_003", customer: "demo_customer_088", amount: "₦89,000", decision: "verify", risk: 42, channel: "web", location: "Ibadan" }
];

export const sampleCustomers = [
  { id: "cust_001", externalId: "demo_customer_001", trustScore: 640, creditScore: 665, tier: "Trusted", transactions: 18 },
  { id: "cust_002", externalId: "demo_customer_002", trustScore: 512, creditScore: 590, tier: "Building", transactions: 7 },
  { id: "cust_003", externalId: "demo_customer_003", trustScore: 870, creditScore: 731, tier: "Elite", transactions: 31 }
];
