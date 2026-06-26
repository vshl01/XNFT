import { randomBytes, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import type { AccessTokenClaims } from "@repo/types";
import { env } from "../config/env.js";
import { durationToSeconds } from "../utils/duration.js";

export const accessTokenTtlSeconds = durationToSeconds(env.ACCESS_TOKEN_TTL);
export const refreshTokenTtlSeconds = durationToSeconds(env.REFRESH_TOKEN_TTL);

/** Sign a short-lived JWT access token carrying the user's identity claims. */
export function signAccessToken(claims: AccessTokenClaims): string {
  return jwt.sign(claims, env.JWT_ACCESS_SECRET, {
    expiresIn: accessTokenTtlSeconds,
  });
}

/** Verify and decode an access token. Throws if invalid or expired. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded === "string" || !decoded.sub) {
    throw new Error("Malformed access token");
  }
  return { sub: String(decoded.sub), email: String(decoded.email) };
}

/**
 * Refresh tokens are opaque, high-entropy random strings — NOT JWTs. We hand
 * the raw token to the client (in an httpOnly cookie) and persist only its
 * SHA-256 hash, so a database leak never exposes usable tokens.
 */
export function generateRefreshToken(): { token: string; tokenHash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, tokenHash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
