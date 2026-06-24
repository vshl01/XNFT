import { z } from "zod";

/**
 * Validation schemas shared by the frontend (form validation) and the
 * backend (request body validation). Keeping them here guarantees a single
 * source of truth for the auth contract across the monorepo.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address")
  .max(254, "Email is too long")
  .toLowerCase();

/**
 * Password policy: 8-72 chars (72 is argon2/bcrypt's practical input ceiling)
 * with at least one letter and one number. Kept intentionally simple — tune
 * in one place when product requirements firm up.
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must be at most 50 characters");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

/**
 * The refresh token normally travels in an httpOnly cookie, but we also accept
 * it in the body to support non-browser clients (mobile, server-to-server).
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
