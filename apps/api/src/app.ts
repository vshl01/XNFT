import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";

/**
 * Build the Express application. Separated from `server.ts` so the app can be
 * imported in tests without binding a port.
 */
export function createApp(): Express {
  const app = express();

  // Behind a proxy/load balancer in production — trust it for correct `req.ip`
  // (used by the rate limiter) and secure-cookie detection.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true, // allow the refresh-token cookie
    }),
  );
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      // One compact line per request. The default serializers dump full
      // request/response headers (incl. unrelated localhost cookies), which
      // is overwhelming in dev — keep only what's useful.
      serializers: {
        req: (req) => ({ method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} → ${res.statusCode}`,
      customErrorMessage: (req, res) =>
        `${req.method} ${req.url} → ${res.statusCode}`,
    }),
  );

  // Lightweight liveness probe.
  app.get("/health", (_req, res) => {
    res.json({ success: true, data: { status: "ok" } });
  });

  app.use("/api/v1", apiRouter);

  // 404 + centralized error handling must come last.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
