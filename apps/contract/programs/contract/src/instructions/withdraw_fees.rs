use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::constants::*;
use crate::errors::MarketplaceError;
use crate::state::Marketplace;

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [MARKETPLACE_SEED],
        bump = marketplace.bump,
        has_one = authority @ MarketplaceError::Unauthorized,
    )]
    pub marketplace: Account<'info, Marketplace>,

    /// CHECK: SOL treasury PDA; identity fixed by seeds.
    #[account(mut, seeds = [TREASURY_SEED], bump = marketplace.treasury_bump)]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Admin-only: moves `amount` lamports of collected fees from the treasury PDA
/// to the authority. The program signs for the treasury PDA.
pub fn handler(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
    require!(
        amount <= ctx.accounts.treasury.lamports(),
        MarketplaceError::InsufficientTreasury
    );

    let seeds: &[&[u8]] = &[TREASURY_SEED, &[ctx.accounts.marketplace.treasury_bump]];
    let signer_seeds = &[seeds];

    transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
    )?;
    Ok(())
}
