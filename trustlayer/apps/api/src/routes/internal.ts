import crypto from "crypto";

import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { sendError, sendJson } from "../lib/response.js";
import { requireInternalAuth, requireRole } from "../middleware/internal-auth.js";
import { aiEngineService } from "../services/ai-engine.service.js";
import { resetMonthlyUsageCounts } from "../services/billing.service.js";
import { analyzeCredit } from "../services/external.service.js";
import { generateApiKey, hashApiKey } from "../services/hash.service.js";
import { completeJob, enqueueJob, failJob } from "../services/job-queue.service.js";
import { sendInviteEmail } from "../services/mail.service.js";
import { buildOtpAuthUri, generateTotpSecret, verifyTotp } from "../services/totp.service.js";
import { sendWebhook } from "../services/webhook.service.js";

const router = Router();

router.use(requireInternalAuth);

router.get("/org/stats", async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);

  const [customers, transactionsToday, flagged, trustAgg] = await Promise.all([
    prisma.bankCustomer.count({ where: { orgId } }),
    prisma.transaction.count({ where: { orgId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
    prisma.transaction.count({ where: { orgId, decision: { in: ["verify", "block"] } } }),
    prisma.bankCustomer.aggregate({ where: { orgId }, _avg: { trustScore: true } })
  ]);

  return sendJson(res, {
    total_customers: customers,
    transactions_today: transactionsToday,
    flagged_count: flagged,
    avg_trust_score: Math.round(trustAgg._avg.trustScore || 0)
  });
});

router.get("/transactions", async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);
  const transactions = await prisma.transaction.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: Number(req.query.limit || 20)
  });
  return sendJson(res, transactions);
});

router.get("/transactions/:id", async (req, res) => {
  const transactionId = String(req.params.id);
  const orgId = req.auth?.org_id;
  const role = req.auth?.role;

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });

  if (!transaction) {
    return sendError(res, "transaction not found", 404);
  }

  if (role !== "super_admin" && transaction.orgId !== orgId) {
    return sendError(res, "forbidden", 403);
  }

  const [customer, recentTransactions] = await Promise.all([
    prisma.bankCustomer.findUnique({
      where: { id: transaction.customerId }
    }),
    prisma.transaction.findMany({
      where: { customerId: transaction.customerId },
      orderBy: { createdAt: "desc" },
      take: 10
    })
  ]);

  return sendJson(res, {
    ...transaction,
    customer,
    recentTransactions
  });
});

router.get("/customers", async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);
  const customers = await prisma.bankCustomer.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: Number(req.query.limit || 20)
  });
  return sendJson(res, customers);
});

router.get("/customers/:id", async (req, res) => {
  const customerId = String(req.params.id);
  const customer = await prisma.bankCustomer.findUnique({
    where: { id: customerId }
  });
  if (!customer) return sendError(res, "customer not found", 404);

  const [trustHistory, transactions, creditInputs] = await Promise.all([
    prisma.trustScoreHistory.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.transaction.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20
    }),
    prisma.creditInput.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);

  const sources = Object.fromEntries(creditInputs.map((item) => [item.inputType, item.data]));
  const creditSummary = Object.keys(sources).length
    ? await aiEngineService.scoreCredit<{
        credit_score: number;
        rating: string;
        breakdown: Record<string, number>;
        loan_eligibility: string;
      }>({ sources })
    : null;

  return sendJson(res, { ...customer, trustHistory, transactions, creditInputs, creditSummary });
});

router.post("/customers/:id/statement-upload", requireRole(["bank_admin", "bank_developer"]), async (req, res) => {
  const customerId = String(req.params.id);
  const orgId = req.auth?.org_id;
  if (!orgId) {
    return sendError(res, "missing org context", 400);
  }

  const parsed = z.object({
    content: z.string().min(1),
    file_type: z.enum(["pdf", "csv"]).default("pdf")
  }).safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, "invalid request", 400);
  }

  const customer = await prisma.bankCustomer.findFirst({
    where: {
      id: customerId,
      orgId
    }
  });

  if (!customer) {
    return sendError(res, "customer not found", 404);
  }

  const job = await enqueueJob({
    orgId,
    customerId,
    jobType: "statement_parse_credit_refresh",
    priority: "normal",
    payload: { file_type: parsed.data.file_type }
  });

  let parsedStatement: Record<string, unknown>;
  let creditResult;
  try {
    parsedStatement = await aiEngineService.parseStatement<Record<string, unknown>>({
      content: parsed.data.content,
      file_type: parsed.data.file_type
    });

    creditResult = await analyzeCredit(orgId, {
      customer_id: customerId,
      data_type: "bank_statement",
      data: parsedStatement
    });

    await completeJob(job.id, {
      parse_metadata: parsedStatement.parse_metadata || {},
      customer_id: customerId
    });
  } catch (error) {
    await failJob(job.id, error instanceof Error ? error.message : "statement upload failed");
    return sendError(res, error instanceof Error ? error.message : "statement upload failed", 422);
  }

  return sendJson(res, {
    job_id: job.id,
    parsed_statement: parsedStatement,
    credit_result: creditResult
  }, 201);
});

router.get("/api-keys", async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);
  return sendJson(res, await prisma.apiKey.findMany({ where: { orgId }, orderBy: { createdAt: "desc" } }));
});

router.post("/api-keys", requireRole(["bank_admin", "bank_developer"]), async (req, res) => {
  const orgId = req.auth?.org_id;
  const userId = req.auth?.sub;
  const parsed = z.object({
    name: z.string(),
    environment: z.enum(["sandbox", "production"]).default("sandbox")
  }).safeParse(req.body);

  if (!parsed.success || !orgId || !userId) {
    return sendError(res, "invalid request", 400);
  }

  const generated = generateApiKey(parsed.data.environment);
  const key = await prisma.apiKey.create({
    data: {
      orgId,
      createdBy: userId,
      name: parsed.data.name,
      keyHash: await hashApiKey(generated.raw),
      keyPrefix: generated.prefix,
      environment: parsed.data.environment
    }
  });

  return sendJson(res, {
    id: key.id,
    key: generated.raw,
    key_prefix: generated.prefix,
    environment: parsed.data.environment,
    warning: "This key will not be shown again."
  }, 201);
});

router.delete("/api-keys/:id", requireRole(["bank_admin", "bank_developer"]), async (req, res) => {
  const apiKeyId = String(req.params.id);
  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false }
  });
  return sendJson(res, { revoked: true });
});

router.get("/audit-logs", async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);
  return sendJson(res, await prisma.auditLog.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 50 }));
});

router.get("/billing", async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);
  const [org, events, settings, goLiveRequests] = await Promise.all([
    prisma.organization.findUnique({ where: { id: orgId } }),
    prisma.billingEvent.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.orgSetting.findUnique({ where: { orgId } }),
    prisma.goLiveRequest.findMany({ where: { orgId }, orderBy: { createdAt: "desc" }, take: 10 })
  ]);
  return sendJson(res, { org, events, settings, goLiveRequests });
});

router.post("/billing/go-live-request", requireRole(["bank_admin"]), async (req, res) => {
  const orgId = req.auth?.org_id;
  const submittedBy = req.auth?.sub;
  if (!orgId || !submittedBy) return sendError(res, "missing org", 400);

  const parsed = z.object({
    company_name: z.string().min(2),
    rc_number: z.string().optional(),
    bank_name: z.string().optional(),
    account_name: z.string().optional(),
    account_number: z.string().optional(),
    use_case_description: z.string().min(10)
  }).safeParse(req.body);

  if (!parsed.success) return sendError(res, "invalid request", 400);

  const request = await prisma.goLiveRequest.create({
    data: {
      orgId,
      submittedBy,
      companyName: parsed.data.company_name,
      rcNumber: parsed.data.rc_number,
      businessDetails: {
        bank_name: parsed.data.bank_name,
        account_name: parsed.data.account_name,
        account_number: parsed.data.account_number
      } as Prisma.InputJsonValue,
      useCaseDescription: parsed.data.use_case_description,
      status: "pending"
    }
  });

  await prisma.billingEvent.create({
    data: {
      orgId,
      eventType: "go_live_requested",
      amountKobo: BigInt(0),
      status: "pending",
      metadata: { go_live_request_id: request.id } as Prisma.InputJsonValue
    }
  });

  return sendJson(res, request, 201);
});

router.patch("/billing/settings", requireRole(["bank_admin"]), async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) return sendError(res, "missing org", 400);

  const parsed = z.object({
    fail_open_mode: z.enum(["allow", "verify"]).optional(),
    squad_enabled: z.boolean().optional(),
    preferred_assistant_name: z.string().optional(),
    preferred_greeting: z.string().optional(),
    sandbox_mode: z.boolean().optional(),
    live_enabled: z.boolean().optional()
  }).safeParse(req.body);

  if (!parsed.success) return sendError(res, "invalid request", 400);

  const settings = await prisma.orgSetting.upsert({
    where: { orgId },
    update: {
      failOpenMode: parsed.data.fail_open_mode,
      squadEnabled: parsed.data.squad_enabled,
      preferredAssistantName: parsed.data.preferred_assistant_name,
      preferredGreeting: parsed.data.preferred_greeting,
      sandboxMode: parsed.data.sandbox_mode,
      liveEnabled: parsed.data.live_enabled,
      updatedAt: new Date()
    },
    create: {
      orgId,
      failOpenMode: parsed.data.fail_open_mode || "verify",
      squadEnabled: parsed.data.squad_enabled || false,
      preferredAssistantName: parsed.data.preferred_assistant_name,
      preferredGreeting: parsed.data.preferred_greeting,
      sandboxMode: parsed.data.sandbox_mode ?? true,
      liveEnabled: parsed.data.live_enabled ?? false
    }
  });

  return sendJson(res, settings);
});

router.get("/auth/2fa", async (req, res) => {
  const userId = req.auth?.sub;
  const email = req.auth?.email;
  if (!userId || !email) return sendError(res, "missing user", 400);

  let security = await prisma.userSecurity.findUnique({
    where: { userId }
  });

  if (!security) {
    const secret = generateTotpSecret();
    security = await prisma.userSecurity.create({
      data: {
        userId,
        totpSecret: secret,
        totpEnabled: false
      }
    });
  }

  return sendJson(res, {
    enabled: security.totpEnabled,
    secret: security.totpSecret,
    otpauth_url: security.totpSecret ? buildOtpAuthUri(security.totpSecret, email) : null
  });
});

router.post("/auth/2fa/enable", async (req, res) => {
  const userId = req.auth?.sub;
  const email = req.auth?.email;
  if (!userId || !email) return sendError(res, "missing user", 400);

  const parsed = z.object({
    code: z.string().min(6),
    secret: z.string().min(16).optional()
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, "invalid request", 400);

  let security = await prisma.userSecurity.findUnique({ where: { userId } });
  const secret = parsed.data.secret || security?.totpSecret || generateTotpSecret();

  if (!verifyTotp(secret, parsed.data.code)) {
    return sendError(res, "invalid authentication code", 400);
  }

  security = await prisma.userSecurity.upsert({
    where: { userId },
    update: {
      totpSecret: secret,
      totpEnabled: true,
      updatedAt: new Date()
    },
    create: {
      userId,
      totpSecret: secret,
      totpEnabled: true
    }
  });

  return sendJson(res, {
    enabled: security.totpEnabled,
    otpauth_url: buildOtpAuthUri(secret, email)
  });
});

router.post("/auth/2fa/verify", async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return sendError(res, "missing user", 400);

  const parsed = z.object({
    code: z.string().min(6)
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, "invalid request", 400);

  const security = await prisma.userSecurity.findUnique({ where: { userId } });
  if (!security?.totpEnabled || !security.totpSecret) {
    return sendError(res, "2fa not enabled", 400);
  }

  if (!verifyTotp(security.totpSecret, parsed.data.code)) {
    return sendError(res, "invalid authentication code", 400);
  }

  return sendJson(res, { verified: true });
});

router.post("/auth/2fa/disable", async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) return sendError(res, "missing user", 400);

  const parsed = z.object({
    code: z.string().min(6)
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, "invalid request", 400);

  const security = await prisma.userSecurity.findUnique({ where: { userId } });
  if (!security?.totpEnabled || !security.totpSecret) {
    return sendJson(res, { disabled: true });
  }

  if (!verifyTotp(security.totpSecret, parsed.data.code)) {
    return sendError(res, "invalid authentication code", 400);
  }

  await prisma.userSecurity.update({
    where: { userId },
    data: {
      totpEnabled: false,
      totpSecret: null,
      updatedAt: new Date()
    }
  });

  return sendJson(res, { disabled: true });
});

router.post("/webhooks", requireRole(["bank_admin"]), async (req, res) => {
  const orgId = req.auth?.org_id;
  if (!orgId) {
    return sendError(res, "missing org context", 400);
  }

  const parsed = z.object({
    url: z.string().url(),
    events: z.array(z.string()).min(1),
    secret: z.string().min(8)
  }).safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, "invalid request", 400);
  }

  const webhook = await prisma.webhook.create({
    data: {
      orgId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret: parsed.data.secret
    }
  });

  return sendJson(res, { webhook_id: webhook.id }, 201);
});

router.post("/webhooks/:id/test", requireRole(["bank_admin"]), async (req, res) => {
  const orgId = req.auth?.org_id;
  const webhookId = String(req.params.id);
  if (!orgId) {
    return sendError(res, "missing org context", 400);
  }

  const webhook = await prisma.webhook.findFirst({
    where: {
      id: webhookId,
      orgId
    }
  });

  if (!webhook) {
    return sendError(res, "webhook not found", 404);
  }

  await sendWebhook(webhook.url, webhook.secret, "webhook.test", {
    webhook_id: webhook.id,
    organization_id: webhook.orgId,
    message: "This is a TrustLayer test delivery"
  });

  return sendJson(res, { tested: true });
});

router.post("/team/invite", requireRole(["bank_admin"]), async (req, res) => {
  const orgId = req.auth?.org_id;
  const invitedBy = req.auth?.sub;
  if (!orgId || !invitedBy) {
    return sendError(res, "missing org context", 400);
  }

  const parsed = z.object({
    email: z.string().email(),
    role: z.enum(["bank_admin", "bank_developer"])
  }).safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, "invalid request", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email }
  });

  if (existing) {
    return sendError(res, "user with that email already exists", 409);
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId }
  });

  if (!org) {
    return sendError(res, "organization not found", 404);
  }

  const inviter = await prisma.user.findUnique({
    where: { id: invitedBy }
  });

  const invite = await prisma.invitation.create({
    data: {
      orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy,
      token: crypto.randomUUID()
    }
  });

  const mailResult = await sendInviteEmail({
    to: invite.email,
    invitedByName: inviter?.fullName || inviter?.email || null,
    organizationName: org.name,
    role: invite.role as "bank_admin" | "bank_developer",
    inviteToken: invite.token
  });

  return sendJson(res, {
    invite_id: invite.id,
    email_sent: mailResult.sent
  }, 201);
});

router.get("/admin/orgs", requireRole(["super_admin"]), async (_req, res) => {
  return sendJson(res, await prisma.organization.findMany({ orderBy: { createdAt: "desc" } }));
});

router.post("/admin/orgs", requireRole(["super_admin"]), async (req, res) => {
  const parsed = z.object({
    name: z.string(),
    slug: z.string(),
    plan: z.enum(["starter", "growth", "enterprise"]).default("starter"),
    admin_email: z.string().email()
  }).safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, "invalid request", 400);
  }

  const org = await prisma.organization.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      plan: parsed.data.plan
    }
  });

  const invite = await prisma.invitation.create({
    data: {
      orgId: org.id,
      email: parsed.data.admin_email,
      role: "bank_admin",
      token: crypto.randomUUID()
    }
  });

  const sender = await prisma.user.findUnique({
    where: { id: req.auth?.sub }
  });

  const mailResult = await sendInviteEmail({
    to: invite.email,
    invitedByName: sender?.fullName || sender?.email || null,
    organizationName: org.name,
    role: "bank_admin",
    inviteToken: invite.token
  });

  return sendJson(res, { ...org, invite, email_sent: mailResult.sent }, 201);
});

router.patch("/admin/orgs/:id", requireRole(["super_admin"]), async (req, res) => {
  const orgId = String(req.params.id);
  const parsed = z.object({
    plan: z.enum(["starter", "growth", "enterprise"]).optional(),
    status: z.enum(["active", "suspended"]).optional()
  }).safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, "invalid request", 400);
  }

  return sendJson(res, await prisma.organization.update({ where: { id: orgId }, data: parsed.data }));
});

router.get("/admin/metrics", requireRole(["super_admin"]), async (_req, res) => {
  const [orgs, apiCalls, flagged, scores, failedJobs, queuedJobs] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.aggregate({ _sum: { apiCallCount: true } }),
    prisma.transaction.count({ where: { decision: { in: ["verify", "block"] } } }),
    prisma.bankCustomer.aggregate({ _avg: { trustScore: true, creditScore: true } }),
    prisma.failedJob.count(),
    prisma.backgroundJob.count({ where: { status: "queued" } })
  ]);

  return sendJson(res, {
    total_orgs: orgs,
    total_api_calls: apiCalls._sum.apiCallCount || 0,
    flagged_transactions: flagged,
    avg_trust_score: Math.round(scores._avg.trustScore || 0),
    avg_credit_score: Math.round(scores._avg.creditScore || 0),
    failed_jobs: failedJobs,
    queued_jobs: queuedJobs
  });
});

router.get("/admin/go-live-requests", requireRole(["super_admin"]), async (_req, res) => {
  const requests = await prisma.goLiveRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 50
  });
  return sendJson(res, requests);
});

router.post("/admin/go-live-requests/:id/approve", requireRole(["super_admin"]), async (req, res) => {
  const requestId = String(req.params.id);
  const reviewerId = req.auth?.sub;
  const parsed = z.object({
    action: z.enum(["approved", "rejected"]).default("approved"),
    review_notes: z.string().optional()
  }).safeParse(req.body);
  if (!parsed.success || !reviewerId) return sendError(res, "invalid request", 400);

  const request = await prisma.goLiveRequest.findUnique({ where: { id: requestId } });
  if (!request) return sendError(res, "go live request not found", 404);

  const [updated] = await prisma.$transaction([
    prisma.goLiveRequest.update({
      where: { id: requestId },
      data: {
        status: parsed.data.action,
        reviewNotes: parsed.data.review_notes,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        updatedAt: new Date()
      }
    }),
    prisma.orgSetting.upsert({
      where: { orgId: request.orgId },
      update: {
        liveEnabled: parsed.data.action === "approved",
        updatedAt: new Date()
      },
      create: {
        orgId: request.orgId,
        liveEnabled: parsed.data.action === "approved"
      }
    }),
    prisma.billingEvent.create({
      data: {
        orgId: request.orgId,
        eventType: parsed.data.action === "approved" ? "go_live_approved" : "go_live_rejected",
        amountKobo: BigInt(0),
        status: parsed.data.action,
        metadata: {
          go_live_request_id: request.id,
          review_notes: parsed.data.review_notes || null
        } as Prisma.InputJsonValue
      }
    })
  ]);

  return sendJson(res, updated);
});

router.post("/admin/monthly-reset", requireRole(["super_admin"]), async (_req, res) => {
  const result = await resetMonthlyUsageCounts();
  return sendJson(res, result);
});

router.get("/admin/failed-jobs", requireRole(["super_admin"]), async (_req, res) => {
  const [failedJobs, backgroundJobs] = await Promise.all([
    prisma.failedJob.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.backgroundJob.findMany({ where: { status: { in: ["queued", "failed"] } }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  return sendJson(res, { failedJobs, backgroundJobs });
});

router.post("/admin/failed-jobs/:id/retry", requireRole(["super_admin"]), async (req, res) => {
  const failedJobId = String(req.params.id);
  const failed = await prisma.failedJob.findUnique({ where: { id: failedJobId } });
  if (!failed) return sendError(res, "failed job not found", 404);

  const retried = await enqueueJob({
    orgId: failed.orgId || undefined,
    jobType: failed.jobType,
    priority: "normal",
    payload: ((failed.payload as Prisma.InputJsonValue | null) ?? {}) as Prisma.InputJsonValue
  });

  await prisma.failedJob.update({
    where: { id: failedJobId },
    data: {
      retryCount: { increment: 1 },
      lastRetriedAt: new Date()
    }
  });

  return sendJson(res, { retried_job_id: retried.id });
});

export default router;
