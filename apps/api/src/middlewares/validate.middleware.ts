import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny, z } from "zod";
import { ValidationError } from "../utils/errors.js";

/**
 * Validate and coerce `req.body` against a zod schema. On success the parsed
 * (typed, trimmed, normalized) value replaces `req.body`; on failure it throws
 * a ValidationError carrying field-level messages for the client to render.
 */
export function validateBody<TSchema extends ZodTypeAny>(schema: TSchema) {
  return (
    req: Request<unknown, unknown, z.infer<TSchema>>,
    _res: Response,
    next: NextFunction,
  ): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      throw new ValidationError(details);
    }
    req.body = result.data;
    next();
  };
}
