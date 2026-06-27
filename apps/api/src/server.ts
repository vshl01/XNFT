import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { registerConsumers } from "./events/consumers/index.js";

// Subscribe event consumers before serving traffic.
registerConsumers();

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 API listening on http://localhost:${env.PORT}`);
});

/** Graceful shutdown: stop accepting connections, then close the DB pool. */
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting_down");
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  // Hard cap so a hung connection can't block forever.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
