import { PrismaClient } from "@prisma/client";
import { isProduction } from "../config/env.js";

/**
 * Prisma client singleton. In development the module can be re-evaluated on
 * hot reload, so we cache the instance on `globalThis` to avoid exhausting the
 * database connection pool with duplicate clients.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ["error"] : ["query", "warn", "error"],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
