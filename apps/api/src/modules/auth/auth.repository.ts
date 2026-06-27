import type { Prisma, Session, User } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/**
 * Data-access layer for auth. The repository is the ONLY place that talks to
 * Prisma for users/sessions — the service depends on these methods, not on the
 * ORM directly, which keeps persistence swappable and the service testable.
 */
export const authRepository = {
  findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  createUser(data: {
    email: string;
    displayName: string;
    passwordHash: string;
  }): Promise<User> {
    return prisma.user.create({ data });
  },

  createSession(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ip?: string;
  }): Promise<Session> {
    return prisma.session.create({ data });
  },

  findSessionByTokenHash(tokenHash: string): Promise<Session | null> {
    return prisma.session.findUnique({ where: { tokenHash } });
  },

  deleteSessionByTokenHash(tokenHash: string): Promise<Prisma.BatchPayload> {
    return prisma.session.deleteMany({ where: { tokenHash } });
  },

  /** Atomically rotate a refresh-token session (delete old, insert new). */
  rotateSession(
    oldTokenHash: string,
    next: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
      userAgent?: string;
      ip?: string;
    },
  ): Promise<[Prisma.BatchPayload, Session]> {
    return prisma.$transaction([
      prisma.session.deleteMany({ where: { tokenHash: oldTokenHash } }),
      prisma.session.create({ data: next }),
    ]);
  },
};
