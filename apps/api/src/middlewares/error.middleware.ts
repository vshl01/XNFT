import type { ErrorRequestHandler, RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import type { ApiError } from "@repo/types";
import { AppError } from "../utils/errors.js";
import { logger } from "../lib/logger.js";
import { isProduction } from "../config/env.js";

/** 404 handler for unmatched routes. */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiError = {
    success: false,
    error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
};

/**
 * Central error translator: every thrown error becomes a typed `ApiError`.
 * Known/expected errors map to their status; anything else is logged and
 * returned as an opaque 500 so internals never leak to clients.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const body: ApiError = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ApiError = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.flatten().fieldErrors as Record<string, string[]>,
      },
    };
    res.status(422).json(body);
    return;
  }

  // Unique-constraint violations (e.g. duplicate email) → 409 Conflict.
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002"
  ) {
    const body: ApiError = {
      success: false,
      error: { code: "CONFLICT", message: "Resource already exists" },
    };
    res.status(409).json(body);
    return;
  }

  logger.error({ err }, "unhandled_error");
  const body: ApiError = {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction
        ? "Something went wrong"
        : err instanceof Error
          ? err.message
          : "Unknown error",
    },
  };
  res.status(500).json(body);
};
