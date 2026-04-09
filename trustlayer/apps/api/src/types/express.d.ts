import type { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: JwtPayload & {
        sub: string;
        role?: string;
        org_id?: string;
        email?: string;
      };
      apiKey?: {
        id: string;
        orgId: string;
        environment: "sandbox" | "production";
        prefix: string;
      };
    }
  }
}

export {};
