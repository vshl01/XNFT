import { Router } from "express";
import { z } from "zod";
import { nftMetadataSchema } from "@repo/types";
import { nftController } from "./nft.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../utils/async-handler.js";

const initializeSchema = z.object({
  feeBps: z.coerce.number().int().min(0).max(1000).optional(),
  operator: z.string().optional(),
});

const updatePriceSchema = z.object({
  price: z.coerce.number().positive(),
});

export const nftRouter: Router = Router();

// Public reads (the marketplace gallery).
nftRouter.get("/", asyncHandler(nftController.list));
nftRouter.get("/:mint", asyncHandler(nftController.getOne));

// Admin-only on-chain actions.
nftRouter.post(
  "/initialize",
  requireAuth,
  validateBody(initializeSchema),
  asyncHandler(nftController.initialize),
);
nftRouter.post(
  "/",
  requireAuth,
  validateBody(nftMetadataSchema),
  asyncHandler(nftController.mint),
);
nftRouter.patch(
  "/:mint/price",
  requireAuth,
  validateBody(updatePriceSchema),
  asyncHandler(nftController.updatePrice),
);
