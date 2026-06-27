import rateLimit from "express-rate-limit";
import type { ApiError } from "@repo/types";

const tooManyRequests: ApiError = {
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Too many attempts. Please try again later.",
  },
};

/**
 * Throttle sensitive auth endpoints (login/register/refresh) to blunt
 * credential-stuffing and brute-force attacks. Keyed by IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: tooManyRequests,
});
