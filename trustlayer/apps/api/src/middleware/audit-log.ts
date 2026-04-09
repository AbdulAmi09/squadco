import type { NextFunction, Request, Response } from "express";

import { prisma } from "../lib/prisma.js";

export function externalAuditLog(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (!req.apiKey) {
      return;
    }

    void prisma.auditLog.create({
      data: {
        orgId: req.apiKey.orgId,
        action: `external.${req.method.toLowerCase()}`,
        resource: req.originalUrl,
        metadata: {
          request_id: req.requestId,
          status_code: res.statusCode,
          api_key_id: req.apiKey.id
        }
      }
    });
  });

  next();
}
