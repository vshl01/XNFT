import type { z } from "zod";
import type { loginSchema, refreshSchema, registerSchema } from "./auth.schema";

/** Request payloads — inferred from the zod schemas so they never drift. */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

/**
 * The public-facing shape of a user. Never includes the password hash or any
 * other sensitive column — this is what the API returns and the client holds.
 */
export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

/** JWT access token + metadata returned to the client on login/register. */
export interface AuthTokens {
  accessToken: string;
  /** Access token lifetime in seconds — lets the client schedule refreshes. */
  expiresIn: number;
}

/** Standard success envelope for the auth session endpoints. */
export interface AuthSession {
  user: AuthUser;
  tokens: AuthTokens;
}

/** Claims encoded inside the signed JWT access token. */
export interface AccessTokenClaims {
  sub: string;
  email: string;
}
