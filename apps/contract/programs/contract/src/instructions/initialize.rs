use anchor_lang::prelude::*;

use crate::constants::*;
use crate::errors::MarketplaceError;
use crate::state::Marketplace;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [MARKETPLACE_SEED],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// CHECK: SOL-only treasury PDA; identity is fixed by its seeds.
    #[account(seeds = [TREASURY_SEED], bump)]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// One-time setup: records the admin authority, the price-update operator, and
/// the marketplace fee. The signer becomes the authority.
pub fn handler(ctx: Context<Initialize>, operator: Pubkey, fee_bps: u16) -> Result<()> {
    require!(fee_bps <= MAX_FEE_BPS, MarketplaceError::FeeTooHigh);

    let marketplace = &mut ctx.accounts.marketplace;
    marketplace.authority = ctx.accounts.authority.key();
    marketplace.operator = operator;
    marketplace.fee_bps = fee_bps;
    marketplace.bump = ctx.bumps.marketplace;
    marketplace.treasury_bump = ctx.bumps.treasury;
    Ok(())
}
