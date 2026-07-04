use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::MarketplaceError;
use crate::state::{Listing, Marketplace};

#[derive(Accounts)]
pub struct UpdatePrice<'info> {
    pub signer: Signer<'info>,

    #[account(seeds = [MARKETPLACE_SEED], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,

    #[account(
        mut,
        seeds = [LISTING_SEED, listing.nft_mint.as_ref()],
        bump = listing.bump,
    )]
    pub listing: Account<'info, Listing>,
}

/// Re-prices a listing. Callable by the authority or the operator (the
/// off-chain pricing bot) — and by no one else.
pub fn handler(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
    require!(new_price > 0, MarketplaceError::InvalidPrice);

    let marketplace = &ctx.accounts.marketplace;
    let signer = ctx.accounts.signer.key();
    require!(
        signer == marketplace.authority || signer == marketplace.operator,
        MarketplaceError::NotPriceUpdater
    );

    ctx.accounts.listing.price = new_price;
    Ok(())
}
