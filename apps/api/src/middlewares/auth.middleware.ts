import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";
import { UnauthorizedError } from "../utils/errors.js";

/**
 * Guard for protected routes. Expects `Authorization: Bearer <accessToken>`,
 * verifies it, and attaches the decoded claims to `req.user`. Rejects with a
 * 401 (TOKEN_EXPIRED so the client knows to refresh) otherwise.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing access token");
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError("Access token is invalid or expired", "TOKEN_EXPIRED");
  }
}
