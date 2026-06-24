/**
 * The form's working state. Everything is a string (raw input values); the
 * shared `nftMetadataSchema` coerces + validates these into the canonical
 * `NftMetadata` on submit.
 */
export interface NftDraft {
  nftName: string;
  symbol: string;
  description: string;
  image: string;
  externalUrl: string;
  player: {
    name: string;
    club: string;
    nationality: string;
    position: string;
    jerseyNumber: string;
    dateOfBirth: string;
  };
  socials: {
    twitter: string;
    instagram: string;
    website: string;
  };
  economics: {
    initialPrice: string;
    totalSupply: string;
    royaltyBps: string;
  };
  attributes: { traitType: string; value: string }[];
}

/** Top-level draft fields (everything outside the nested groups). */
export type NftRootField =
  | "nftName"
  | "symbol"
  | "description"
  | "image"
  | "externalUrl";

/** The nested groups that share a generic section updater. */
export type NftDraftSection = "player" | "socials" | "economics";

export const EMPTY_NFT_DRAFT: NftDraft = {
  nftName: "",
  symbol: "",
  description: "",
  image: "",
  externalUrl: "",
  player: {
    name: "",
    club: "",
    nationality: "",
    position: "",
    jerseyNumber: "",
    dateOfBirth: "",
  },
  socials: { twitter: "", instagram: "", website: "" },
  economics: { initialPrice: "", totalSupply: "", royaltyBps: "" },
  attributes: [],
};
