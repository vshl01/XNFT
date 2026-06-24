use anchor_lang::prelude::*;

#[error_code]
pub enum MarketplaceError {
    #[msg("Fee exceeds the allowed maximum")]
    FeeTooHigh,
    #[msg("Only the marketplace authority may perform this action")]
    Unauthorized,
    #[msg("Only the authority or operator may update the price")]
    NotPriceUpdater,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
    #[msg("Requested amount exceeds the treasury balance")]
    InsufficientTreasury,
    #[msg("Arithmetic overflow")]
    Overflow,
}
