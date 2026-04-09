import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { sendError, sendJson } from "../lib/response.js";
import { externalAuditLog } from "../middleware/audit-log.js";
import { requireApiKey } from "../middleware/api-key-auth.js";
import { aiEngineService } from "../services/ai-engine.service.js";
import { analyzeCredit, analyzeTransaction, registerCustomer } from "../services/external.service.js";

const router = Router();
const assistantBuckets = new Map<string, { count: number; resetAt: number }>();

router.use(requireApiKey, externalAuditLog);

router.post("/transaction/analyze", async (req, res) => {
  const parsed = z.object({
    customer_id: z.string().uuid(),
    amount: z.number().int().positive(),
    currency: z.string().default("NGN"),
    merchant: z.string().optional(),
    location: z.string().optional(),
    device_id: z.string().optional(),
    channel: z.string().optional()
  }).safeParse(req.body);

  if (!parsed.success || !req.apiKey) {
    return sendError(res, "invalid request", 400);
  }

  return sendJson(res, await analyzeTransaction(req.apiKey.orgId, parsed.data, req.requestId));
});

router.post("/customer/register", async (req, res) => {
  const parsed = z.object({
    external_id: z.string(),
    bvn_hash: z.string().optional(),
    phone_hash: z.string().optional()
  }).safeParse(req.body);

  if (!parsed.success || !req.apiKey) {
    return sendError(res, "invalid request", 400);
  }

  const customer = await registerCustomer(req.apiKey.orgId, parsed.data);
  return sendJson(res, {
    customer_id: customer.id,
    trust_score: customer.trustScore,
    credit_score: customer.creditScore
  }, 201);
});

router.get("/customer/:externalId/profile", async (req, res) => {
  if (!req.apiKey) {
    return sendError(res, "unauthorized", 401);
  }

  const customer = await prisma.bankCustomer.findFirst({
    where: {
      orgId: req.apiKey.orgId,
      externalId: req.params.externalId
    }
  });

  if (!customer) {
    return sendError(res, "customer not found", 404);
  }

  return sendJson(res, {
    trust_score: customer.trustScore,
    credit_score: customer.creditScore,
    risk_tier: customer.riskTier,
    total_transactions: customer.totalTransactions,
    flagged_count: customer.flaggedTransactions
  });
});

router.post("/credit/analyze", async (req, res) => {
  const parsed = z.object({
    customer_id: z.string().uuid(),
    data_type: z.string(),
    data: z.record(z.any())
  }).safeParse(req.body);

  if (!parsed.success || !req.apiKey) {
    return sendError(res, "invalid request", 400);
  }

  return sendJson(res, await analyzeCredit(req.apiKey.orgId, parsed.data));
});

router.post("/assistant/chat", async (req, res) => {
  const parsed = z.object({
    customer_id: z.string().uuid(),
    message: z.string(),
    history: z.array(z.object({ role: z.string(), content: z.string() })).default([])
  }).safeParse(req.body);

  if (!parsed.success || !req.apiKey) {
    return sendError(res, "invalid request", 400);
  }

  const customerBucketKey = `${req.apiKey.orgId}:${parsed.data.customer_id}`;
  const now = Date.now();
  const bucket = assistantBuckets.get(customerBucketKey);
  if (!bucket || bucket.resetAt < now) {
    assistantBuckets.set(customerBucketKey, { count: 1, resetAt: now + 60_000 });
  } else {
    if (bucket.count >= 20) {
      return res.status(429).json({
        request_id: res.getHeader("x-request-id"),
        error: "rate_limit_exceeded",
        retry_after: 60
      });
    }
    bucket.count += 1;
  }

  const customer = await prisma.bankCustomer.findUnique({
    where: { id: parsed.data.customer_id }
  });

  if (!customer) {
    return sendError(res, "customer not found", 404);
  }

  const transactions = await prisma.transaction.findMany({
    where: { customerId: parsed.data.customer_id },
    take: 20,
    orderBy: { createdAt: "desc" }
  });

  const org = await prisma.organization.findFirst({
    where: customer ? { id: customer.orgId } : undefined
  });
  const orgSettings = customer ? await prisma.orgSetting.findUnique({ where: { orgId: customer.orgId } }) : null;

  const categorizedTransactions = await Promise.all(
    transactions.slice(0, 10).map(async (tx) => {
      try {
        const category = await aiEngineService.categorize<{ category: string }>({
          merchant: tx.merchant,
          description: tx.merchant
        }, req.requestId);
        return {
          amount: Number(tx.amount),
          merchant: tx.merchant,
          decision: tx.decision,
          category: category.category
        };
      } catch {
        return {
          amount: Number(tx.amount),
          merchant: tx.merchant,
          decision: tx.decision,
          category: "uncategorized"
        };
      }
    })
  );

  const topCategories = Object.entries(
    categorizedTransactions.reduce<Record<string, number>>((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category);

  const averageMonthlySpend = transactions.length
    ? Math.round(transactions.reduce((sum, tx) => sum + Number(tx.amount), 0) / Math.max(transactions.length, 1))
    : 0;

  let predictedBalanceLine = "Balance prediction unavailable.";
  try {
    const currentBalanceEstimate = Math.max(
      0,
      transactions.reduce((sum, tx) => sum - Number(tx.amount), 1_000_000)
    );
    const prediction = await aiEngineService.predictBalance<{ predicted_balance: number; warning?: string | null }>({
      current_balance: currentBalanceEstimate,
      target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      transactions: transactions.map((tx) => ({
        amount: Number(tx.amount) * -1,
        merchant: tx.merchant,
        created_at: tx.createdAt
      }))
    }, req.requestId);
    predictedBalanceLine = prediction.warning
      ? `${prediction.warning} Predicted balance: NGN ${Math.round(prediction.predicted_balance).toLocaleString()}.`
      : `Predicted balance in 14 days: NGN ${Math.round(prediction.predicted_balance).toLocaleString()}.`;
  } catch {
    predictedBalanceLine = "Balance prediction unavailable.";
  }

  const lastFlagged = transactions.find((tx) => tx.decision === "verify" || tx.decision === "block");

  const prompt = [
    `You are ${orgSettings?.preferredAssistantName || "a smart, friendly financial assistant"} for ${org?.name || "this bank"}.`,
    `${orgSettings?.preferredGreeting || ""}`,
    `Trust Score: ${customer.trustScore}/1000 (${customer.riskTier})`,
    `Credit Score: ${customer.creditScore}/850`,
    `Average monthly spend: NGN ${averageMonthlySpend.toLocaleString()}`,
    `Top spending categories: ${topCategories.join(", ") || "unknown"}`,
    `Last flagged transaction: ${lastFlagged ? `${lastFlagged.merchant || "transaction"} was ${lastFlagged.decision}` : "none"}`,
    `Recent transactions: ${JSON.stringify(categorizedTransactions.slice(0, 5))}`,
    predictedBalanceLine,
    "Keep responses under 3 sentences unless a list is clearly better.",
    "If the customer writes in Nigerian Pidgin, respond in Pidgin."
  ].join("\n");

  let reply = "I can help explain your recent transactions, spending pattern, and next steps to improve your financial profile.";
  try {
    const result = await aiEngineService.explain<{ explanation: string }>({
      prompt_type: "assistant_chat",
      context_data: {
        prompt: `${prompt}\nConversation: ${JSON.stringify(parsed.data.history)}\nCustomer: ${parsed.data.message}`
      }
    }, req.requestId);
    reply = result.explanation;
  } catch {
    reply = lastFlagged
      ? `Your last flagged transaction was marked ${lastFlagged.decision}. Review unusual amount, device, or location changes and try again if needed.`
      : "Your account looks active. Keep savings consistent and avoid unusual device or location changes to maintain a strong profile.";
  }

  return sendJson(res, {
    reply,
    suggested_actions: ["Review spending categories", "Check balance outlook", "View customer profile"]
  });
});

router.post("/webhooks/register", async (req, res) => {
  const parsed = z.object({
    url: z.string().url(),
    events: z.array(z.string()),
    secret: z.string().min(8)
  }).safeParse(req.body);

  if (!parsed.success || !req.apiKey) {
    return sendError(res, "invalid request", 400);
  }

  const webhook = await prisma.webhook.create({
    data: {
      orgId: req.apiKey.orgId,
      ...parsed.data
    }
  });

  return sendJson(res, { webhook_id: webhook.id }, 201);
});

router.post("/sandbox/transaction/analyze", (_req, res) => {
  return sendJson(res, {
    transaction_id: "sandbox_tx_001",
    risk_score: 42,
    decision: "verify",
    ai_explanation: "This payment is higher than usual and came from a new device, so extra verification is needed.",
    risk_factors: [
      { type: "amount_deviation", ratio: 3.4, severity: "medium" },
      { type: "new_device", severity: "medium" }
    ]
  });
});

router.post("/sandbox/customer/register", (_req, res) => {
  return sendJson(res, {
    customer_id: "sandbox_customer_001",
    trust_score: 500,
    credit_score: 0
  }, 201);
});

router.get("/sandbox/customer/:externalId/profile", (req, res) => {
  return sendJson(res, {
    external_id: req.params.externalId,
    trust_score: 575,
    credit_score: 640,
    risk_tier: "building",
    total_transactions: 12,
    flagged_count: 1
  });
});

router.post("/sandbox/credit/analyze", (_req, res) => {
  return sendJson(res, {
    credit_score: 650,
    rating: "Good",
    breakdown: {
      transaction_history: 72,
      bank_statement: 68,
      bvn_identity: 90,
      behavioral: 65,
      airtime: 55
    },
    loan_eligibility: "Eligible for loans up to ₦500,000",
    improvement_tips: ["Upload your bank statement", "Maintain consistent monthly savings"]
  });
});

router.post("/sandbox/assistant/chat", (_req, res) => {
  return sendJson(res, {
    reply: "Your spending is fairly stable, but consistent monthly savings would strengthen your profile.",
    suggested_actions: ["Upload bank statement", "Review savings"]
  });
});

router.post("/sandbox/webhooks/register", (_req, res) => {
  return sendJson(res, { webhook_id: "sandbox_webhook_001" }, 201);
});

export default router;
