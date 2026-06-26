import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Wrap an async route handler so rejected promises are forwarded to Express's
 * error middleware instead of crashing the process. Lets controllers simply
 * `throw` AppErrors.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
