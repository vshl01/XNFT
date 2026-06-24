use anchor_lang::prelude::*;

/// PDA seed for the single marketplace config account.
#[constant]
pub const MARKETPLACE_SEED: &[u8] = b"marketplace";

/// PDA seed for a per-NFT listing account (combined with the mint).
#[constant]
pub const LISTING_SEED: &[u8] = b"listing";

/// PDA seed for the SOL treasury that collects marketplace fees.
#[constant]
pub const TREASURY_SEED: &[u8] = b"treasury";

/// Hard cap on the marketplace fee (10%).
pub const MAX_FEE_BPS: u16 = 1_000;

/// Basis-point denominator.
pub const BPS_DENOMINATOR: u128 = 10_000;
