import type { z } from "zod";
import type {
  nftAttributeSchema,
  nftMetadataSchema,
  playerPositions,
} from "./nft.schema";

/** Validated, canonical xNFT metadata (output of `nftMetadataSchema`). */
export type NftMetadata = z.infer<typeof nftMetadataSchema>;

/** The input shape before defaults/coercion (what a form submits). */
export type NftMetadataInput = z.input<typeof nftMetadataSchema>;

export type NftAttribute = z.infer<typeof nftAttributeSchema>;

export type PlayerPosition = (typeof playerPositions)[number];
