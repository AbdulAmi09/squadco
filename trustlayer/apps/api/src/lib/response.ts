import type { Response } from "express";

export function sendJson(res: Response, data: unknown, status = 200) {
  return res.status(status).json({
    request_id: res.getHeader("x-request-id"),
    data
  });
}

export function sendError(res: Response, message: string, status = 400) {
  return res.status(status).json({
    request_id: res.getHeader("x-request-id"),
    error: message
  });
}
