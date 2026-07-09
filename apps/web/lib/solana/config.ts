import { PublicKey } from "@solana/web3.js";

/**
 * Client-side Solana config. These must match the backend / deployed program.
 * The cluster is devnet by default; override with NEXT_PUBLIC_SOLANA_RPC_URL.
 */
export const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

/** The deployed marketplace program (matches the contract's declare_id!). */
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "Gbd3BXqzgMW5xMHp3LEER1SfHaAQ2Kgu7wb16efHaTso",
);

/**
 * Anchor's 8-byte instruction discriminator for `buy`, copied from the IDL.
 * `buy` takes no arguments, so this is the entire instruction data.
 */
export const BUY_DISCRIMINATOR = Uint8Array.from([
  102, 6, 61, 18, 1, 218, 235, 234,
]);

export const LAMPORTS_PER_SOL = 1_000_000_000;
