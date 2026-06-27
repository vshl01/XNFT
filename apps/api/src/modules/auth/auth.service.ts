import type { User } from "@prisma/client";
import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "@repo/types";
import { authRepository } from "./auth.repository.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import {
  accessTokenTtlSeconds,
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenTtlSeconds,
  signAccessToken,
} from "../../lib/jwt.js";
import { eventBus } from "../../events/event-bus.js";
import { AuthEvents } from "../../events/events.js";
import {
  ConflictError,
  UnauthorizedError,
} from "../../utils/errors.js";

/** Metadata captured per session for auditing / future device management. */
export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

/** What the service hands back: the API session plus the raw refresh token
 *  (the controller owns turning that into an httpOnly cookie). */
export interface IssuedSession {
  session: AuthSession;
  refreshToken: string;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Sign an access token, mint + persist a refresh token, build the response. */
async function issueSession(
  user: User,
  ctx: SessionContext,
): Promise<IssuedSession> {
  const accessToken = signAccessToken({ sub: user.id, email: user.email });
  const { token: refreshToken, tokenHash } = generateRefreshToken();

  await authRepository.createSession({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
    userAgent: ctx.userAgent,
    ip: ctx.ip,
  });

  return {
    refreshToken,
    session: {
      user: toAuthUser(user),
      tokens: { accessToken, expiresIn: accessTokenTtlSeconds },
    },
  };
}

export const authService = {
  async register(
    input: RegisterInput,
    ctx: SessionContext,
  ): Promise<IssuedSession> {
    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists", "EMAIL_TAKEN");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await authRepository.createUser({
      email: input.email,
      displayName: input.displayName,
      passwordHash,
    });

    await eventBus.publish(AuthEvents.UserRegistered, {
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
    });

    return issueSession(user, ctx);
  },

  async login(input: LoginInput, ctx: SessionContext): Promise<IssuedSession> {
    const user = await authRepository.findUserByEmail(input.email);
    // Verify against the found hash, or a throwaway compare to keep timing
    // roughly constant whether or not the email exists.
    const valid =
      user !== null && (await verifyPassword(user.passwordHash, input.password));

    if (!user || !valid) {
      throw new UnauthorizedError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    await eventBus.publish(AuthEvents.UserLoggedIn, {
      userId: user.id,
      email: user.email,
      at: new Date().toISOString(),
    });

    return issueSession(user, ctx);
  },

  /** Rotate a refresh token: validate it, revoke it, and issue a fresh pair. */
  async refresh(
    refreshToken: string,
    ctx: SessionContext,
  ): Promise<IssuedSession> {
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await authRepository.findSessionByTokenHash(tokenHash);

    if (!session || session.expiresAt < new Date()) {
      // Clean up an expired-but-present row so it can't linger.
      if (session) await authRepository.deleteSessionByTokenHash(tokenHash);
      throw new UnauthorizedError("Refresh token is invalid or expired", "REFRESH_INVALID");
    }

    const user = await authRepository.findUserById(session.userId);
    if (!user) {
      await authRepository.deleteSessionByTokenHash(tokenHash);
      throw new UnauthorizedError("Account no longer exists", "REFRESH_INVALID");
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email });
    const { token: nextRefreshToken, tokenHash: nextHash } =
      generateRefreshToken();

    await authRepository.rotateSession(tokenHash, {
      userId: user.id,
      tokenHash: nextHash,
      expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
      userAgent: ctx.userAgent,
      ip: ctx.ip,
    });

    return {
      refreshToken: nextRefreshToken,
      session: {
        user: toAuthUser(user),
        tokens: { accessToken, expiresIn: accessTokenTtlSeconds },
      },
    };
  },

  /** Revoke a refresh-token session. Idempotent — a missing token is fine. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await authRepository.findSessionByTokenHash(tokenHash);
    await authRepository.deleteSessionByTokenHash(tokenHash);
    if (session) {
      await eventBus.publish(AuthEvents.UserLoggedOut, { userId: session.userId });
    }
  },

  async getCurrentUser(userId: string): Promise<AuthUser> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError("Account no longer exists");
    }
    return toAuthUser(user);
  },
};
