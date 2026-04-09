import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";

import { sendError, sendJson } from "./lib/response.js";
import { swaggerSpec } from "./lib/swagger.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import externalRoutes from "./routes/external.js";
import internalRoutes from "./routes/internal.js";
import publicRoutes from "./routes/public.js";
import { captureException } from "./services/monitoring.service.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));
  app.use(requestIdMiddleware);

  app.get("/health", (_req, res) => sendJson(res, { status: "ok" }));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use("/public", publicRoutes);
  app.use("/v1", externalRoutes);
  app.use("/internal", internalRoutes);

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void captureException(err);
    return sendError(res, "internal server error", 500);
  });

  return app;
}
