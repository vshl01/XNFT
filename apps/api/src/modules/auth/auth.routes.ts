import { Router } from "express";
import { loginSchema, registerSchema } from "@repo/types";
import { authController } from "./auth.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { authRateLimiter } from "../../middlewares/rate-limit.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";

export const authRouter: Router = Router();

// Public endpoints — throttled to resist brute force.
authRouter.post(
  "/register",
  authRateLimiter,
  validateBody(registerSchema),
  asyncHandler(authController.register),
);

authRouter.post(
  "/login",
  authRateLimiter,
  validateBody(loginSchema),
  asyncHandler(authController.login),
);

authRouter.post("/refresh", authRateLimiter, asyncHandler(authController.refresh));

authRouter.post("/logout", asyncHandler(authController.logout));

// Protected endpoint — requires a valid access token.
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
