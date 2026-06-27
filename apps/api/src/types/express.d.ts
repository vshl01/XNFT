import type { AccessTokenClaims } from "@repo/types";

// Attach the authenticated principal to the request object. Populated by the
// `requireAuth` middleware after verifying the access token.
declare global {
  namespace Express {
    interface Request {
      user?: AccessTokenClaims;
    }
  }
}

export {};
