import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = uuidv4();
  res.setHeader("x-request-id", req.requestId);
  next();
}
