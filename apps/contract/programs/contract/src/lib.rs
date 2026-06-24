use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("Gbd3BXqzgMW5xMHp3LEER1SfHaAQ2Kgu7wb16efHaTso");

/// XNFT football marketplace: mint dynamic football NFTs and trade them
/// trustlessly. Each instruction below just delegates to its module handler.
#[program]
pub mod contract {
    use super::*;

    /// One-time setup of the marketplace config (admin, operator, fee).
    pub fn initialize(ctx: Context<Initialize>, operator: Pubkey, fee_bps: u16) -> Result<()> {
        instructions::initialize::handler(ctx, operator, fee_bps)
    }

    /// Admin mints an NFT into escrow and lists it in one signed transaction.
    pub fn mint_and_list(ctx: Context<MintAndList>, args: MintAndListArgs) -> Result<()> {
        instructions::mint_and_list::handler(ctx, args)
    }

    /// Authority or operator re-prices a listing (off-chain pricing bot).
    pub fn update_price(ctx: Context<UpdatePrice>, new_price: u64) -> Result<()> {
        instructions::update_price::handler(ctx, new_price)
    }

    /// Buyer purchases a listed NFT — atomic SOL↔NFT swap, no seller signature.
    pub fn buy(ctx: Context<Buy>) -> Result<()> {
        instructions::buy::handler(ctx)
    }

    /// Admin cancels a listing and reclaims the NFT.
    pub fn delist(ctx: Context<Delist>) -> Result<()> {
        instructions::delist::handler(ctx)
    }

    /// Admin withdraws collected fees from the treasury.
    pub fn withdraw_fees(ctx: Context<WithdrawFees>, amount: u64) -> Result<()> {
        instructions::withdraw_fees::handler(ctx, amount)
    }
}
