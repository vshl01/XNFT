import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";

/**
 * Root API router. Each feature module mounts its own sub-router here, so
 * adding a domain (nft, market, admin…) later is a one-line change.
 */
export const apiRouter: Router = Router();

apiRouter.use("/auth", authRouter);
