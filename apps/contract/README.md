# XNFT Marketplace — Anchor Program

The on-chain program for the XNFT football marketplace. It mints football NFTs
and lets people **buy and sell them trustlessly** — funds and the NFT swap
atomically, so no one can take money without delivering.

This program is the **only** thing that changes on-chain state. The web frontend
and the TypeScript backend never move tokens or SOL themselves; they only
*call* the instructions here, and the program enforces every rule.

---

## 1. Mental model

```
Frontend (wallet)  ─┐
                    ├─►  THIS PROGRAM  ─►  changes on-chain state (escrow, swap, prices)
Backend (operator) ─┘
```

- **Thin clients, fat program.** Clients build + sign transactions that *invoke*
  instructions. The program does the actual escrow, swaps, and access control.
- A smart contract can't act on its own — someone always signs the transaction
  that triggers it. The point is *who* signs, and what the program lets them do.

---

## 2. Folder structure

```
programs/contract/src/
├── lib.rs                 # program entry — each fn delegates to a handler
├── constants.rs           # PDA seeds + fee constants
├── errors.rs              # custom error codes
├── state/
│   ├── marketplace.rs     # Marketplace config account (one per deployment)
│   └── listing.rs         # Listing account (one per NFT for sale)
└── instructions/
    ├── initialize.rs      # set up the marketplace (admin, operator, fee)
    ├── mint_and_list.rs   # mint an NFT into escrow + list it
    ├── update_price.rs    # re-price a listing (authority/operator)
    ├── buy.rs             # buyer purchases — atomic SOL↔NFT swap
    ├── delist.rs          # admin cancels a listing, reclaims the NFT
    └── withdraw_fees.rs   # admin withdraws collected fees
```

Each instruction file holds its own `#[derive(Accounts)]` context + `handler`,
so one file = one operation. `lib.rs` is just a thin index of them.

---

## 3. The accounts (PDAs)

A **PDA** (Program Derived Address) is an account the program owns and can
"sign" for *programmatically* — it has no private key. PDAs are what let the
program move escrowed NFTs without anyone's key.

| PDA | Seeds | Holds / does |
| --- | --- | --- |
| **Marketplace** | `["marketplace"]` | Config: `authority`, `operator`, `fee_bps`. Created once by `initialize`. |
| **Treasury** | `["treasury"]` | A SOL-only account that collects marketplace fees. |
| **Listing** | `["listing", nft_mint]` | One per sale: `seller`, `nft_mint`, `price`. Also **owns the escrow**. |
| **Escrow** | ATA(owner = Listing PDA, mint = NFT) | Holds the NFT while it's listed. The program releases it on `buy`. |

`update_price`, `buy`, and `delist` all re-derive the Listing PDA from the NFT
mint, so the link between an NFT and its sale is tamper-proof.

---

## 4. How an NFT is minted (`mint_and_list`)

One admin-signed transaction does everything, in order:

1. **Create the mint** — a new SPL mint with `decimals = 0`.
2. **Mint 1 token into escrow** — the NFT goes straight to the Listing-owned
   escrow account (the admin never holds it).
3. **Write Metaplex metadata** (`create_metadata_accounts_v3`) — name, symbol,
   and the `uri` (the off-chain JSON on Arweave/IPFS produced by the admin UI).
   This is what makes every wallet/marketplace recognize it as a real NFT.
4. **Create the master edition** (`create_master_edition_v3`, `max_supply = 0`)
   — locks the supply at 1, making it a true non-fungible.
5. **Open the listing** — write `seller`, `nft_mint`, `price`.

Result: the admin signs **once**, and the NFT is created *and* immediately for
sale. The admin remains the metadata **update authority** (can update later) and
**verified creator** (royalties), even after the NFT is sold.

---

## 5. Who signs what — the key question

| Instruction | Who signs | Why |
| --- | --- | --- |
| `initialize` | **Admin** | Sets themselves as authority. |
| `mint_and_list` | **Admin** (your wallet) | Creating + listing inventory. Your private key is used **here** — once per NFT. |
| `update_price` | **Admin or operator** | The operator is the backend pricing bot; it can *only* change prices. |
| `buy` | **Buyer** (their wallet) | The buyer pays; the program releases the NFT. **No admin/seller signature** — listing pre-authorized the sale. |
| `delist` | **Admin** | Reclaim an unsold NFT. |
| `withdraw_fees` | **Admin** | Pull collected fees from the treasury. |

**The crucial point:** your private key signs only when you *mint/list*,
*delist*, or *withdraw*. It is **never** needed for a sale. Once listed, the NFT
sits in the program-owned escrow, and the program signs as the **Listing PDA**
(via its seeds) to hand it to any buyer. That's why selling is automatic and
trustless.

The **operator** is a separate, limited key (kept in the backend). Even if it
leaked, the program only lets it call `update_price` — it can't withdraw funds
or move NFTs.

---

## 6. How a sale works (`buy`) — atomic and trustless

When a buyer calls `buy`, the program does all of this in **one** transaction
(all-or-nothing):

1. Buyer → **seller**: `price − fee` lamports.
2. Buyer → **treasury**: the `fee` (`price × fee_bps / 10_000`).
3. Program (signing as the **Listing PDA**) transfers the NFT from escrow to the
   buyer's token account.
4. Closes the empty escrow and the listing, returning their rent to the seller.

If any step fails, the whole thing reverts — the buyer can't lose SOL without
getting the NFT, and vice versa.

---

## 7. On-chain vs off-chain (pricing)

- **On-chain (this program):** ownership, escrow, the listed `price`, and every
  settled trade. Authoritative.
- **Off-chain (backend):** the rapidly-changing *indicative* price from the
  social/news/demand formula. The backend's **operator** key periodically calls
  `update_price` to push the latest number on-chain — it never moves funds.

Postgres in the backend is a **mirror** of on-chain state for fast reads, never
the source of truth.

---

## 8. Instruction reference

| Instruction | Args | Signer | Key accounts |
| --- | --- | --- | --- |
| `initialize` | `operator: Pubkey`, `fee_bps: u16` | authority | marketplace, treasury |
| `mint_and_list` | `MintAndListArgs { name, symbol, uri, seller_fee_basis_points, price }` | authority | mint, listing, escrow, metadata, master_edition |
| `update_price` | `new_price: u64` | authority \| operator | listing |
| `buy` | — | buyer | listing, escrow, buyer_nft_account, seller, treasury |
| `delist` | — | authority | listing, escrow, authority_nft_account |
| `withdraw_fees` | `amount: u64` | authority | treasury |

`MintAndListArgs` lives in `instructions/mint_and_list.rs`. `fee_bps` is capped
at `MAX_FEE_BPS` (10%).

---

## 9. Build · deploy · test

```bash
# from apps/contract
anchor build                 # compile the program + generate the IDL/types
anchor deploy                # deploy to the configured cluster
anchor test                  # run the TS test suite (localnet)
```

Cluster + wallet are set in `Anchor.toml` (`localnet` by default). To target
devnet, switch `[provider] cluster = "devnet"` and fund your wallet:

```bash
solana airdrop 2 <your-pubkey> --url devnet
```

The program ID is declared in `lib.rs` (`declare_id!`) and `Anchor.toml`. After
the first build, sync it with `anchor keys sync` if you regenerate the keypair.

### Dependency pins (important)

Solana's bundled Rust (1.84) is older than some freshly-released transitive
crates, which fail to build (`edition2024` / `rustc 1.85` required). `Cargo.lock`
pins them to compatible versions. If you regenerate the lockfile, re-apply:

```bash
cargo update -p blake3 --precise 1.5.5
cargo update -p zeroize --precise 1.8.1
cargo update -p zeroize_derive --precise 1.4.2
cargo update -p 'proc-macro-crate@3.5.0' --precise 3.2.0
cargo update -p indexmap --precise 2.13.0
cargo update -p unicode-segmentation --precise 1.12.0
```

(Or simply upgrade the Solana toolchain to one shipping Rust ≥ 1.85.)

---

## 10. How the rest of the app talks to it

- **Frontend:** the admin signs `mint_and_list` / `delist` with their wallet;
  buyers sign `buy`. Uses `@coral-xyz/anchor` with the generated IDL.
- **Backend:** runs the pricing formula and signs `update_price` with the
  operator key; indexes on-chain events into Postgres and emits Kafka events
  (e.g. `nft.sold`). It never signs a sale and never custodies funds.

---

## 11. Notes / next steps

- The TS test in `tests/` still targets the original scaffold and should be
  rewritten against these instructions.
- Royalties are recorded via the verified creator in metadata; enforcing them on
  secondary sales (and verified collections) is a natural follow-up.
- An optional on-chain `snapshot` account could store stats if you ever want them
  fully verifiable on-chain (today they live off-chain by design).
