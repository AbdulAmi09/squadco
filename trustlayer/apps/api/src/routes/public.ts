import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { sendError, sendJson } from "../lib/response.js";
import { supabaseAdmin } from "../lib/supabase.js";

const router = Router();

router.get("/invitations/:token", async (req, res) => {
  const token = String(req.params.token);
  const invitation = await prisma.invitation.findUnique({
    where: { token }
  });

  if (!invitation) {
    return sendError(res, "invite not found", 404);
  }

  if (Date.now() - new Date(invitation.createdAt).getTime() > 14 * 24 * 60 * 60 * 1000) {
    return sendError(res, "invite expired", 410);
  }

  if (invitation.acceptedAt) {
    return sendError(res, "invite already accepted", 409);
  }

  const organization = invitation.orgId
    ? await prisma.organization.findUnique({ where: { id: invitation.orgId } })
    : null;

  return sendJson(res, {
    email: invitation.email,
    role: invitation.role,
    organization_name: organization?.name || "TrustLayer"
  });
});

router.post("/invitations/accept", async (req, res) => {
  const parsed = z.object({
    token: z.string(),
    full_name: z.string().min(2),
    password: z.string().min(8)
  }).safeParse(req.body);

  if (!parsed.success) {
    return sendError(res, "invalid request", 400);
  }

  const invitation = await prisma.invitation.findUnique({
    where: { token: parsed.data.token }
  });

  if (!invitation) {
    return sendError(res, "invite not found", 404);
  }

  if (Date.now() - new Date(invitation.createdAt).getTime() > 14 * 24 * 60 * 60 * 1000) {
    return sendError(res, "invite expired", 410);
  }

  if (invitation.acceptedAt) {
    return sendError(res, "invite already accepted", 409);
  }

  const existingProfile = await prisma.user.findUnique({
    where: { email: invitation.email }
  });

  if (existingProfile) {
    return sendError(res, "user with that email already exists", 409);
  }

  const createResult = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      full_name: parsed.data.full_name
    }
  });

  if (createResult.error || !createResult.data.user) {
    return sendError(res, createResult.error?.message || "failed to create auth user", 400);
  }

  const user = createResult.data.user;

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: user.id,
        orgId: invitation.orgId || null,
        role: invitation.role,
        fullName: parsed.data.full_name,
        email: invitation.email
      }
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() }
    })
  ]);

  return sendJson(res, {
    accepted: true,
    email: invitation.email
  }, 201);
});

export default router;
