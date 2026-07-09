import type { Request, Response } from "express";
import type { NftMetadata } from "@repo/types";
import { nftService } from "./nft.service.js";
import { sendSuccess } from "../../utils/response.js";

export const nftController = {
  async initialize(req: Request, res: Response) {
    const { feeBps, operator } = req.body as { feeBps?: number; operator?: string };
    sendSuccess(res, await nftService.initialize(feeBps, operator));
  },

  async mint(req: Request, res: Response) {
    // Body validated by validateBody(nftMetadataSchema).
    const nft = await nftService.mintAndList(req.body as NftMetadata);
    sendSuccess(res, nft, 201);
  },

  async list(_req: Request, res: Response) {
    sendSuccess(res, await nftService.list());
  },

  async getOne(req: Request, res: Response) {
    sendSuccess(res, await nftService.getByMint(req.params.mint as string));
  },

  async updatePrice(req: Request, res: Response) {
    const { price } = req.body as { price: number };
    sendSuccess(res, await nftService.updatePrice(req.params.mint as string, price));
  },

  // Raw Metaplex JSON for the on-chain `uri` — NOT wrapped in the api envelope,
  // because wallets/marketplaces expect the bare metadata shape.
  async metadata(req: Request, res: Response) {
    res.json(await nftService.getMetaplexJson(req.params.mint as string));
  },
};
