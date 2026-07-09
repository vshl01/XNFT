import { z } from "zod";

/**
 * Canonical xNFT metadata format — the SINGLE source of truth shared by the
 * admin UI (now), the backend API (next), and the on-chain program (later).
 * Kept deliberately flat and primitive-friendly so it maps cleanly to chain
 * metadata (Metaplex-style: name / symbol / description / image / attributes).
 *
 * Bump `schemaVersion` if the shape changes so old records stay decodable.
 */

export const playerPositions = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
] as const;

/** Turn empty form strings into `undefined` so optional fields serialize cleanly. */
const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

const optText = (max: number) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

const optUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("Enter a valid URL").optional(),
);

const optInt = (min: number, max: number) =>
  z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(min).max(max).optional(),
  );

const optNonNeg = z.preprocess(
  emptyToUndefined,
  z.coerce.number().nonnegative().optional(),
);

/** One on-chain trait, e.g. { traitType: "Goals", value: "12" }. */
export const nftAttributeSchema = z.object({
  traitType: z.string().trim().min(1, "Trait name is required").max(40),
  value: z.string().trim().min(1, "Value is required").max(60),
});

export const nftMetadataSchema = z.object({
  /** Format version — lets the backend/contract decode older records safely. */
  schemaVersion: z.literal(1).default(1),

  // ── NFT identity ──────────────────────────────────────────────────────
  nftName: z.string().trim().min(2, "NFT name is too short").max(60),
  symbol: optText(10),
  description: z.string().trim().min(10, "Add a longer description").max(1000),
  image: z.string().trim().url("Enter a valid image URL"),
  externalUrl: optUrl,

  // ── Footballer ────────────────────────────────────────────────────────
  player: z.object({
    name: z.string().trim().min(2, "Player name is too short").max(60),
    nationality: optText(56),
    club: optText(60),
    position: z.preprocess(
      emptyToUndefined,
      z.enum(playerPositions).optional(),
    ),
    jerseyNumber: optInt(1, 99),
    dateOfBirth: optText(10), // ISO yyyy-mm-dd
  }),

  // ── Social accounts (whole group optional) ────────────────────────────
  socials: z
    .object({
      twitter: optText(60),
      instagram: optText(60),
      website: optUrl,
    })
    .default({}),

  // ── Initial economics (frozen snapshot at mint) ───────────────────────
  economics: z
    .object({
      initialPrice: optNonNeg, // in SOL (or chosen unit)
      totalSupply: optInt(1, 1_000_000),
      royaltyBps: optInt(0, 10_000), // basis points, 500 = 5%
    })
    .default({}),

  // ── Arbitrary on-chain traits ─────────────────────────────────────────
  attributes: z.array(nftAttributeSchema).max(20).default([]),
});
