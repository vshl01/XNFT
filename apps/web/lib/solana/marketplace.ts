import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type SendOptions,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
// Import from the `buffer` package (web3.js's dep) rather than the Node global,
// which Next.js does not polyfill in the browser bundle.
import { Buffer } from "buffer";
import { BUY_DISCRIMINATOR, PROGRAM_ID } from "./config";

const enc = (s: string) => new TextEncoder().encode(s);

// ─── PDAs (mirror the program's seeds, see apps/api/src/lib/solana.ts) ───────

function marketplacePda(): PublicKey {
  return PublicKey.findProgramAddressSync([enc("marketplace")], PROGRAM_ID)[0];
}

function treasuryPda(): PublicKey {
  return PublicKey.findProgramAddressSync([enc("treasury")], PROGRAM_ID)[0];
}

function listingPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [enc("listing"), mint.toBuffer()],
    PROGRAM_ID,
  )[0];
}

/** Escrow token account = ATA owned by the listing PDA (off-curve owner). */
function escrowAta(mint: PublicKey, listing: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(mint, listing, true);
}

/**
 * The `buy` instruction needs the seller pubkey (it's `listing.seller`, which
 * the on-chain account constrains via `address = listing.seller`). The backend
 * mirror doesn't store it, so we read it straight from the listing account:
 * layout is discriminator(8) | seller(32) | nft_mint(32) | price(8) | bump(1).
 */
async function fetchSeller(
  connection: Connection,
  listing: PublicKey,
): Promise<PublicKey> {
  const info = await connection.getAccountInfo(listing);
  if (!info) throw new Error("Listing not found on-chain (is it still listed?)");
  return new PublicKey(info.data.subarray(8, 40));
}

interface BuyArgs {
  connection: Connection;
  buyer: PublicKey;
  mintAddress: string;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
}

/**
 * Build, sign (via the connected wallet), and send a `buy` transaction.
 * We sign with the wallet but send through OUR connection, so the purchase
 * always lands on the configured cluster (devnet) regardless of which network
 * the wallet UI has selected.
 */
export async function buyNft({
  connection,
  buyer,
  mintAddress,
  signTransaction,
}: BuyArgs): Promise<string> {
  const mint = new PublicKey(mintAddress);
  const listing = listingPda(mint);
  const seller = await fetchSeller(connection, listing);

  const keys = [
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: marketplacePda(), isSigner: false, isWritable: false },
    { pubkey: listing, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: escrowAta(mint, listing), isSigner: false, isWritable: true },
    {
      pubkey: getAssociatedTokenAddressSync(mint, buyer),
      isSigner: false,
      isWritable: true,
    },
    { pubkey: seller, isSigner: false, isWritable: true },
    { pubkey: treasuryPda(), isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys,
    data: Buffer.from(BUY_DISCRIMINATOR), // no args — just the discriminator
  });

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  const tx = new Transaction({
    feePayer: buyer,
    blockhash,
    lastValidBlockHeight,
  }).add(ix);

  const signed = await signTransaction(tx);
  const opts: SendOptions = { preflightCommitment: "confirmed" };
  const signature = await connection.sendRawTransaction(signed.serialize(), opts);

  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );

  return signature;
}
