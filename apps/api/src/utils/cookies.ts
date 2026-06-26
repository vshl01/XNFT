import type { CookieOptions, Response } from "express";
import { env, isProduction } from "../config/env.js";
import { refreshTokenTtlSeconds } from "../lib/jwt.js";

export const REFRESH_COOKIE_NAME = "xnft_refresh_token";

/**
 * Cookie holding the refresh token. httpOnly + sameSite blocks JS access and
 * CSRF-style cross-site sends; the path scopes it to the auth endpoints so it
 * is never attached to unrelated API calls.
 */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction || env.COOKIE_SECURE,
    sameSite: "lax",
    domain: env.COOKIE_DOMAIN,
    path: "/api/v1/auth",
  };
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: refreshTokenTtlSeconds * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, baseCookieOptions());
}