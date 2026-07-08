import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { contractIdl } from "./idl/contract.js";
import type { Contract } from "./idl/contract-types.js";

/** Metaplex Token Metadata program — fixed address on every Solana cluster. */
export const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

/** Accept either a JSON byte array (solana CLI id.json) or a base58 secret. */
function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmed) as number[]);
  }
  return bs58.decode(trimmed);
}

export interface SolanaContext {
  connection: Connection;
  provider: anchor.AnchorProvider;
  program: anchor.Program<Contract>;
  admin: Keypair;
}

let cached: SolanaContext | null = null;

/**
 * Lazily build the Solana context from env (PVT_KEY/PUB_KEY). The server can
 * boot without these set; only on-chain actions require them, so we validate
 * here and surface a clean 503 rather than crashing at startup.
 */
export function getSolana(): SolanaContext {
  if (cached) return cached;

  if (!env.PVT_KEY) {
    throw new AppError(
      503,
      "SOLANA_NOT_CONFIGURED",
      "On-chain actions are unavailable: PVT_KEY is not set in the backend env",
    );
  }

  let admin: Keypair;
  try {
    admin = Keypair.fromSecretKey(parseSecretKey(env.PVT_KEY));
  } catch {
    throw new AppError(500, "SOLANA_BAD_KEY", "PVT_KEY could not be parsed");
  }

  // If PUB_KEY is provided, it must match the secret key's public key.
  if (env.PUB_KEY && env.PUB_KEY !== admin.publicKey.toBase58()) {
    throw new AppError(
      500,
      "SOLANA_KEY_MISMATCH",
      "PUB_KEY does not match the public key derived from PVT_KEY",
    );
  }

  const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(admin), {
    commitment: "confirmed",
  });
  const program = new anchor.Program<Contract>(contractIdl, provider);

  cached = { connection, provider, program, admin };
  return cached;
}

// ─── PDA + account derivations (mirror the program's seeds) ────────────────

export function marketplacePda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("marketplace")], programId)[0];
}

export function treasuryPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from("treasury")], programId)[0];
}

export function listingPda(mint: PublicKey, programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("listing"), mint.toBuffer()],
    programId,
  )[0];
}

/** Escrow token account = ATA owned by the listing PDA (off-curve owner). */
export function escrowAta(mint: PublicKey, listing: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, listing, true);
}

export function metadataPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

export function masterEditionPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("edition"),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  )[0];
}

export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };
