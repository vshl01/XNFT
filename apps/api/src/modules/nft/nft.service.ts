import BN from "bn.js";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import type { Nft } from "@prisma/client";
import type { NftMetadata } from "@repo/types";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_METADATA_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  escrowAta,
  getSolana,
  listingPda,
  marketplacePda,
  masterEditionPda,
  metadataPda,
  treasuryPda,
} from "../../lib/solana.js";
import { BadRequestError, NotFoundError } from "../../utils/errors.js";
import { nftRepository } from "./nft.repository.js";
import { solToLamports, toMetaplexJson, type MetaplexJson } from "./metaplex.js";

const lamportsBn = (value: bigint) => new BN(value.toString());
const metadataUriFor = (mint: string) =>
  `${env.API_PUBLIC_URL}/api/v1/metadata/${mint}`;

export const nftService = {
  /** One-time marketplace setup. Admin becomes authority; operator may reprice. */
  async initialize(feeBps = 250, operator?: string): Promise<{ signature: string }> {
    const { program, admin } = getSolana();
    const programId = program.programId;
    const operatorKey = operator ? new PublicKey(operator) : admin.publicKey;

    const signature = await program.methods
      .initialize(operatorKey, feeBps)
      .accountsPartial({
        authority: admin.publicKey,
        marketplace: marketplacePda(programId),
        treasury: treasuryPda(programId),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return { signature };
  },

  /** Mint an NFT into escrow and list it, then mirror it into Postgres. */
  async mintAndList(input: NftMetadata): Promise<Nft> {
    const price = input.economics.initialPrice;
    if (!price || price <= 0) {
      throw new BadRequestError("economics.initialPrice (SOL) is required to mint");
    }

    const { program, admin } = getSolana();
    const programId = program.programId;

    const mint = Keypair.generate();
    const mintAddress = mint.publicKey.toBase58();
    const uri = metadataUriFor(mintAddress);
    const lamports = solToLamports(price);
    const listing = listingPda(mint.publicKey, programId);

    const signature = await program.methods
      .mintAndList({
        name: input.nftName,
        symbol: input.symbol ?? "",
        uri,
        sellerFeeBasisPoints: input.economics.royaltyBps ?? 0,
        price: lamportsBn(lamports),
      })
      .accountsPartial({
        authority: admin.publicKey,
        marketplace: marketplacePda(programId),
        mint: mint.publicKey,
        listing,
        escrow: escrowAta(mint.publicKey, listing),
        metadata: metadataPda(mint.publicKey),
        masterEdition: masterEditionPda(mint.publicKey),
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc();

    logger.info({ mintAddress, signature }, "nft.minted");

    return nftRepository.create({
      mintAddress,
      name: input.nftName,
      symbol: input.symbol ?? null,
      image: input.image,
      metadataUri: uri,
      // Round-trip strips `undefined` so it's valid Prisma JSON.
      metadata: JSON.parse(JSON.stringify(input)),
      priceLamports: lamports.toString(),
      txSignature: signature,
    });
  },

  /** Re-price a listing on-chain (admin/operator) and update the mirror. */
  async updatePrice(mintAddress: string, newPriceSol: number): Promise<Nft> {
    if (newPriceSol <= 0) throw new BadRequestError("price must be greater than zero");

    const existing = await nftRepository.findByMint(mintAddress);
    if (!existing) throw new NotFoundError("NFT not found");

    const { program, admin } = getSolana();
    const programId = program.programId;
    const mint = new PublicKey(mintAddress);
    const lamports = solToLamports(newPriceSol);

    await program.methods
      .updatePrice(lamportsBn(lamports))
      .accountsPartial({
        signer: admin.publicKey,
        marketplace: marketplacePda(programId),
        listing: listingPda(mint, programId),
      })
      .rpc();

    return nftRepository.updatePrice(mintAddress, lamports.toString());
  },

  list(): Promise<Nft[]> {
    return nftRepository.list();
  },

  async getByMint(mintAddress: string): Promise<Nft> {
    const nft = await nftRepository.findByMint(mintAddress);
    if (!nft) throw new NotFoundError("NFT not found");
    return nft;
  },

  /** The Metaplex JSON served at the on-chain `uri` (wallets fetch this). */
  async getMetaplexJson(mintAddress: string): Promise<MetaplexJson> {
    const nft = await nftRepository.findByMint(mintAddress);
    if (!nft) throw new NotFoundError("NFT not found");
    return toMetaplexJson(nft.metadata as unknown as NftMetadata);
  },
};
