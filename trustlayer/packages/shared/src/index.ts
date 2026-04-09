export const TRUST_TIERS = {
  UNVERIFIED: "unverified",
  BUILDING: "building",
  TRUSTED: "trusted",
  ELITE: "elite"
} as const;

export const DECISIONS = {
  ALLOW: "allow",
  VERIFY: "verify",
  BLOCK: "block"
} as const;

export const API_KEY_PREFIX = {
  SANDBOX: "tl_sandbox_",
  LIVE: "tl_live_"
} as const;

export type TrustTier = (typeof TRUST_TIERS)[keyof typeof TRUST_TIERS];
export type Decision = (typeof DECISIONS)[keyof typeof DECISIONS];

export type RiskFactor = {
  type: string;
  severity?: "low" | "medium" | "high";
  [key: string]: unknown;
};
