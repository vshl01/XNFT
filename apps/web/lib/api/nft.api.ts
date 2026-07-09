import { apiFetch } from "./client";

/** A listed NFT as returned by the public gallery endpoint (the Prisma row). */
export interface MarketNft {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string | null;
  image: string;
  metadataUri: string;
  priceLamports: string;
  status: "LISTED" | "SOLD" | "DELISTED";
  txSignature: string | null;
  createdAt: string;
}

export const nftApi = {
  /** Public marketplace gallery — every minted/listed NFT. */
  list(): Promise<MarketNft[]> {
    return apiFetch<MarketNft[]>("/nft");
  },
};
