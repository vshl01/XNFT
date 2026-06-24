use anchor_lang::prelude::*;

/// One active sale, stored at the `listing` PDA derived from the NFT mint.
/// The listing PDA also owns the escrow token account holding the NFT.
#[account]
#[derive(InitSpace)]
pub struct Listing {
    /// Receives the sale proceeds and any reclaimed rent (the admin/owner).
    pub seller: Pubkey,
    /// The NFT being sold.
    pub nft_mint: Pubkey,
    /// Sale price in lamports.
    pub price: u64,
    pub bump: u8,
}
