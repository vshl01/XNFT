use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    close_account, transfer as token_transfer, CloseAccount, Mint, Token, TokenAccount,
    Transfer as TokenTransfer,
};

use crate::constants::*;
use crate::errors::MarketplaceError;
use crate::state::{Listing, Marketplace};

#[derive(Accounts)]
pub struct Delist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [MARKETPLACE_SEED],
        bump = marketplace.bump,
        has_one = authority @ MarketplaceError::Unauthorized,
    )]
    pub marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        seeds = [LISTING_SEED, nft_mint.key().as_ref()],
        bump = listing.bump,
        has_one = nft_mint,
        close = authority,
    )]
    pub listing: Account<'info, Listing>,

    pub nft_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = nft_mint,
        associated_token::authority = listing,
    )]
    pub escrow: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = nft_mint,
        associated_token::authority = authority,
    )]
    pub authority_nft_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Admin-only: cancels a listing and returns the NFT to the authority.
pub fn handler(ctx: Context<Delist>) -> Result<()> {
    let mint_key = ctx.accounts.nft_mint.key();
    let seeds: &[&[u8]] = &[LISTING_SEED, mint_key.as_ref(), &[ctx.accounts.listing.bump]];
    let signer_seeds = &[seeds];

    token_transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.authority_nft_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow.to_account_info(),
            destination: ctx.accounts.authority.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        },
        signer_seeds,
    ))?;

    Ok(())
}
