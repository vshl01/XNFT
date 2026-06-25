import pino from "pino";
import { env, isProduction } from "../config/env.js";

/**
 * Single structured logger for the whole service. In development it pretty
 * prints; in production it emits JSON lines for log aggregators.
 */
export const logger = pino({
  level: isProduction ? "info" : "debug",
  ...(isProduction
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        },
      }),
  base: { env: env.NODE_ENV },
});
