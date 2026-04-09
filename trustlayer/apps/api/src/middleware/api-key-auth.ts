import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcryptjs";

import { prisma } from "../lib/prisma.js";
import { sendError } from "../lib/response.js";
import { captureMessage } from "../services/monitoring.service.js";
import { incrementWindow } from "../services/upstash.service.js";

const WINDOW_MS = 60_000;
const LIMIT = 100;
const buckets = new Map<string, { count: number; resetAt: number }>();
const orgBuckets = new Map<string, { count: number; resetAt: number }>();

async function withinLimit(id: string) {
  try {
    const redisCount = await incrementWindow(`ratelimit:key:${id}`, WINDOW_MS / 1000);
    if (redisCount) {
      return redisCount <= LIMIT;
    }
  } catch {
    await captureMessage("Upstash key rate limit fallback engaged", "warning", { scope: "api_key", keyId: id });
  }

  const now = Date.now();
  const bucket = buckets.get(id);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(id, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const rawKey = req.header("x-trustlayer-key");
  if (!rawKey) {
    return sendError(res, "missing API key", 401);
  }

  const candidates = await prisma.apiKey.findMany({
    where: {
      isActive: true,
      keyPrefix: {
        startsWith: rawKey.slice(0, 12)
      }
    }
  });

  for (const candidate of candidates) {
    if (!(await bcrypt.compare(rawKey, candidate.keyHash))) {
      continue;
    }

    if (!(await withinLimit(candidate.id))) {
      return sendError(res, "rate limit exceeded", 429);
    }

    req.apiKey = {
      id: candidate.id,
      orgId: candidate.orgId,
      environment: candidate.environment as "sandbox" | "production",
      prefix: candidate.keyPrefix
    };

    const org = await prisma.organization.findUnique({
      where: { id: candidate.orgId }
    });
    if (!org) {
      return sendError(res, "organization not found", 404);
    }

    if (candidate.environment === "production" && org.apiCallCount >= org.monthlyLimit) {
      return res.status(429).json({
        request_id: res.getHeader("x-request-id"),
        error: "monthly_call_limit_reached",
        limit: org.monthlyLimit,
        used: org.apiCallCount
      });
    }

    try {
      const orgRateCount = await incrementWindow(`ratelimit:org:${candidate.orgId}`, WINDOW_MS / 1000);
      if (orgRateCount && orgRateCount > 1000) {
        return sendError(res, "org rate limit exceeded", 429);
      }
    } catch {
      await captureMessage("Upstash org rate limit fallback engaged", "warning", { scope: "organization", orgId: candidate.orgId });
      const orgNow = Date.now();
      const orgBucket = orgBuckets.get(candidate.orgId);
      if (!orgBucket || orgBucket.resetAt < orgNow) {
        orgBuckets.set(candidate.orgId, { count: 1, resetAt: orgNow + WINDOW_MS });
      } else {
        if (orgBucket.count >= 1000) {
          return sendError(res, "org rate limit exceeded", 429);
        }
        orgBucket.count += 1;
      }
    }

    await prisma.apiKey.update({
      where: { id: candidate.id },
      data: { lastUsedAt: new Date() }
    });
    await prisma.organization.update({
      where: { id: candidate.orgId },
      data: { apiCallCount: { increment: 1 } }
    });

    return next();
  }

  return sendError(res, "invalid API key", 401);
}
