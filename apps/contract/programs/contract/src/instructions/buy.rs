use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{
    close_account, transfer as token_transfer, CloseAccount, Mint, Token, TokenAccount,
    Transfer as TokenTransfer,
};

use crate::constants::*;
use crate::errors::MarketplaceError;
use crate::state::{Listing, Marketplace};

#[derive(Accounts)]
pub struct Buy<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(seeds = [MARKETPLACE_SEED], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        seeds = [LISTING_SEED, nft_mint.key().as_ref()],
        bump = listing.bump,
        has_one = nft_mint,
        close = seller,
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
        payer = buyer,
        associated_token::mint = nft_mint,
        associated_token::authority = buyer,
    )]
    pub buyer_nft_account: Account<'info, TokenAccount>,

    /// CHECK: receives proceeds + reclaimed rent; pinned to the listing's seller.
    #[account(mut, address = listing.seller)]
    pub seller: SystemAccount<'info>,

    /// CHECK: SOL treasury PDA that collects the fee.
    #[account(mut, seeds = [TREASURY_SEED], bump = marketplace.treasury_bump)]
    pub treasury: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

/// Buyer pays the listing price; the program atomically pays the seller (minus
/// fee), routes the fee to the treasury, and releases the NFT from escrow.
/// No seller/admin signature is required — the listing pre-authorized it.
pub fn handler(ctx: Context<Buy>) -> Result<()> {
    let price = ctx.accounts.listing.price;
    let fee = (price as u128)
        .checked_mul(ctx.accounts.marketplace.fee_bps as u128)
        .ok_or(MarketplaceError::Overflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(MarketplaceError::Overflow)? as u64;
    let proceeds = price.checked_sub(fee).ok_or(MarketplaceError::Overflow)?;

    // Buyer → seller (proceeds).
    transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        ),
        proceeds,
    )?;

    // Buyer → treasury (fee).
    if fee > 0 {
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            fee,
        )?;
    }

    // The program signs as the listing PDA to move the NFT out of escrow.
    let mint_key = ctx.accounts.nft_mint.key();
    let seeds: &[&[u8]] = &[LISTING_SEED, mint_key.as_ref(), &[ctx.accounts.listing.bump]];
    let signer_seeds = &[seeds];

    token_transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TokenTransfer {
                from: ctx.accounts.escrow.to_account_info(),
                to: ctx.accounts.buyer_nft_account.to_account_info(),
                authority: ctx.accounts.listing.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    // Close the now-empty escrow, returning its rent to the seller.
    close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow.to_account_info(),
            destination: ctx.accounts.seller.to_account_info(),
            authority: ctx.accounts.listing.to_account_info(),
        },
        signer_seeds,
    ))?;

    Ok(())
}
