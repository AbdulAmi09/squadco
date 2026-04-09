import type { NextFunction, Request, Response } from "express";

import { sendError } from "../lib/response.js";
import { supabaseAdmin } from "../lib/supabase.js";

export async function requireInternalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return sendError(res, "missing bearer token", 401);
  }

  try {
    const token = header.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return sendError(res, "invalid token", 401);
    }

    const profile = await supabaseAdmin
      .from("users")
      .select("id, org_id, role, email")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!profile.data) {
      return sendError(res, "dashboard profile missing", 403);
    }

    req.auth = {
      sub: profile.data.id,
      org_id: profile.data.org_id || undefined,
      role: profile.data.role,
      email: profile.data.email
    };

    return next();
  } catch {
    return sendError(res, "invalid token", 401);
  }
}

export function requireRole(roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth?.role || !roles.includes(req.auth.role)) {
      return sendError(res, "forbidden", 403);
    }
    return next();
  };
}
