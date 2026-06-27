import type { Request, Response } from "express";
import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "@repo/types";
import { authService, type SessionContext } from "./auth.service.js";
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from "../../utils/cookies.js";
import { sendSuccess } from "../../utils/response.js";
import { UnauthorizedError } from "../../utils/errors.js";

function sessionContext(req: Request): SessionContext {
  return { userAgent: req.headers["user-agent"], ip: req.ip };
}

function readRefreshToken(req: Request): string | undefined {
  return (
    (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ??
    (req.body as { refreshToken?: string } | undefined)?.refreshToken
  );
}

export const authController = {
  async register(req: Request, res: Response) {
    // Body shape is guaranteed by the validateBody(registerSchema) middleware.
    const { session, refreshToken } = await authService.register(
      req.body as RegisterInput,
      sessionContext(req),
    );
    setRefreshCookie(res, refreshToken);
    sendSuccess<AuthSession>(res, session, 201);
  },

  async login(req: Request, res: Response) {
    const { session, refreshToken } = await authService.login(
      req.body as LoginInput,
      sessionContext(req),
    );
    setRefreshCookie(res, refreshToken);
    sendSuccess<AuthSession>(res, session, 200);
  },

  async refresh(req: Request, res: Response) {
    const token = readRefreshToken(req);
    if (!token) {
      throw new UnauthorizedError("No refresh token provided", "REFRESH_INVALID");
    }
    const { session, refreshToken } = await authService.refresh(
      token,
      sessionContext(req),
    );
    setRefreshCookie(res, refreshToken);
    sendSuccess<AuthSession>(res, session, 200);
  },

  async logout(req: Request, res: Response) {
    await authService.logout(readRefreshToken(req));
    clearRefreshCookie(res);
    sendSuccess(res, { ok: true });
  },

  async me(req: Request, res: Response) {
    // `requireAuth` guarantees req.user is present.
    const user = await authService.getCurrentUser(req.user!.sub);
    sendSuccess<AuthUser>(res, user);
  },
};
