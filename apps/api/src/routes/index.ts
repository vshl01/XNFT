import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import { nftRouter } from "../modules/nft/nft.routes.js";
import { nftController } from "../modules/nft/nft.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

/**
 * Root API router. Each feature module mounts its own sub-router here, so
 * adding a domain (nft, market, admin…) later is a one-line change.
 */
export const apiRouter: Router = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/nft", nftRouter);

// Public metadata endpoint — the target of each NFT's on-chain `uri`.
apiRouter.get("/metadata/:mint", asyncHandler(nftController.metadata));
