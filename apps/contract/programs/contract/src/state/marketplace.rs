use anchor_lang::prelude::*;

/// Global config (one per deployment), stored at the `marketplace` PDA.
#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    /// Admin: mints, delists, and withdraws fees.
    pub authority: Pubkey,
    /// Limited role: may only update listing prices (the off-chain pricing bot).
    pub operator: Pubkey,
    /// Marketplace fee in basis points (e.g. 250 = 2.5%).
    pub fee_bps: u16,
    pub bump: u8,
    pub treasury_bump: u8,
}
