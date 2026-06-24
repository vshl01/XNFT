use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_master_edition_v3, create_metadata_accounts_v3,
    mpl_token_metadata::types::{Creator, DataV2},
    CreateMasterEditionV3, CreateMetadataAccountsV3, Metadata,
};
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};

use crate::constants::*;
use crate::errors::MarketplaceError;
use crate::state::{Listing, Marketplace};

/// Arguments for a new NFT. `uri` points at the off-chain JSON (Arweave/IPFS)
/// produced by the admin UI.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MintAndListArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: u16,
    pub price: u64,
}

#[derive(Accounts)]
pub struct MintAndList<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [MARKETPLACE_SEED],
        bump = marketplace.bump,
        has_one = authority @ MarketplaceError::Unauthorized,
    )]
    pub marketplace: Account<'info, Marketplace>,

    // New NFT mint: 0 decimals, supply locked to 1 by the master edition below.
    #[account(
        init,
        payer = authority,
        mint::decimals = 0,
        mint::authority = authority,
        mint::freeze_authority = authority,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        space = 8 + Listing::INIT_SPACE,
        seeds = [LISTING_SEED, mint.key().as_ref()],
        bump,
    )]
    pub listing: Account<'info, Listing>,

    // Program-owned escrow that holds the NFT while listed (owned by `listing`).
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = listing,
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// CHECK: created + validated by the Token Metadata program via CPI.
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: created + validated by the Token Metadata program via CPI.
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Mints one NFT straight into escrow, writes its metadata, and opens a
/// listing — so the admin's single signature both creates and lists the NFT.
pub fn handler(ctx: Context<MintAndList>, args: MintAndListArgs) -> Result<()> {
    require!(args.price > 0, MarketplaceError::InvalidPrice);

    // 1. Mint exactly one token into the escrow account.
    mint_to(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.escrow.to_account_info(),
                authority: ctx.accounts.authority.to_account_info(),
            },
        ),
        1,
    )?;

    // 2. Attach Metaplex metadata so every wallet/marketplace recognizes it.
    let data = DataV2 {
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        seller_fee_basis_points: args.seller_fee_basis_points,
        creators: Some(vec![Creator {
            address: ctx.accounts.authority.key(),
            verified: true,
            share: 100,
        }]),
        collection: None,
        uses: None,
    };

    create_metadata_accounts_v3(
        CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.authority.to_account_info(),
                payer: ctx.accounts.authority.to_account_info(),
                update_authority: ctx.accounts.authority.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ),
        data,
        true,  // is_mutable — the admin can update stats later
        true,  // update_authority_is_signer
        None,
    )?;

    // 3. Create the master edition → locks supply at 1 (a true non-fungible).
    create_master_edition_v3(
        CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMasterEditionV3 {
                edition: ctx.accounts.master_edition.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.authority.to_account_info(),
                mint_authority: ctx.accounts.authority.to_account_info(),
                payer: ctx.accounts.authority.to_account_info(),
                metadata: ctx.accounts.metadata.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        ),
        Some(0),
    )?;

    // 4. Record the listing — the NFT is now for sale.
    let listing = &mut ctx.accounts.listing;
    listing.seller = ctx.accounts.authority.key();
    listing.nft_mint = ctx.accounts.mint.key();
    listing.price = args.price;
    listing.bump = ctx.bumps.listing;
    Ok(())
}
