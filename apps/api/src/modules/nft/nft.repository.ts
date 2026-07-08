import type { Nft, NftStatus, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

/** Data-access for NFTs. Only place that talks to Prisma for the nfts table. */
export const nftRepository = {
  create(data: Prisma.NftCreateInput): Promise<Nft> {
    return prisma.nft.create({ data });
  },

  findByMint(mintAddress: string): Promise<Nft | null> {
    return prisma.nft.findUnique({ where: { mintAddress } });
  },

  list(): Promise<Nft[]> {
    return prisma.nft.findMany({ orderBy: { createdAt: "desc" } });
  },

  updatePrice(mintAddress: string, priceLamports: string): Promise<Nft> {
    return prisma.nft.update({ where: { mintAddress }, data: { priceLamports } });
  },

  setStatus(mintAddress: string, status: NftStatus): Promise<Nft> {
    return prisma.nft.update({ where: { mintAddress }, data: { status } });
  },
};
