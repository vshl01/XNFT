import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { NftMetadata } from "@repo/types";

/** The off-chain JSON wallets/marketplaces fetch from the on-chain `uri`. */
export interface MetaplexJson {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: { trait_type: string; value: string }[];
  properties: { files: { uri: string; type: string }[]; category: string };
}

/** Map our canonical metadata into the Metaplex JSON standard. */
export function toMetaplexJson(m: NftMetadata): MetaplexJson {
  const attributes: { trait_type: string; value: string }[] = [];
  const push = (trait: string, value?: string | number) => {
    if (value !== undefined && value !== "") {
      attributes.push({ trait_type: trait, value: String(value) });
    }
  };

  push("Player", m.player.name);
  push("Club", m.player.club);
  push("Nationality", m.player.nationality);
  push("Position", m.player.position);
  push("Jersey", m.player.jerseyNumber);
  for (const attr of m.attributes) push(attr.traitType, attr.value);

  return {
    name: m.nftName,
    symbol: m.symbol ?? "",
    description: m.description,
    image: m.image,
    external_url: m.externalUrl ?? "",
    attributes,
    properties: {
      files: [{ uri: m.image, type: "image/png" }],
      category: "image",
    },
  };
}

/** Convert a SOL amount to integer lamports. */
export function solToLamports(sol: number): bigint {
  return BigInt(Math.round(sol * LAMPORTS_PER_SOL));
}
