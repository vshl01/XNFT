# ⚽ Dynamic xNFT Football Marketplace — Full Architecture & Build Guide

> This doc explains _what_ we're building, _why_ each piece exists, _how_ the pieces talk to each other, the _exact folder layout_, every _API endpoint_, and the _event-driven backbone_. If you've never seen this project before, start at Section 1 and you'll understand it by the end.

---

## 1. What Are We Building? (Plain English)

A website where fans **buy and sell special football NFTs**.

Each NFT is tied to a real footballer. What makes it _special_ (an **xNFT** — "executable / dynamic NFT") is that it **updates itself with live stats**. When you buy it, we **freeze a snapshot** ("Haaland had 12 goals when you bought this"). Later it shows **"now he has 19"** — so you can see how your asset grew. Prices also nudge up and down based on **demand**.

There are **two faces** to the app:

| Dashboard           | Who uses it                   | What they do                                                               |
| ------------------- | ----------------------------- | -------------------------------------------------------------------------- |
| **User Dashboard**  | Public / fans                 | Connect wallet, browse NFTs, see prices + "then vs. now" stats, buy & sell |
| **Admin Dashboard** | Only you (password-protected) | Mint new NFTs, list/unlist, edit, delete (burn)                            |

**Tech stack:**

- **Smart Contract:** Anchor (Rust) on **Solana devnet** — the source of truth for ownership.
- **Backend:** Rust + **Axum** — the brain: APIs, auth, indexing, the event system.
- **Frontend:** **React** — what users see.
- **Supporting cast:** **Postgres** (database), **Redis** (cache + real-time), **Kafka/NATS** (event bus), **Email service** (transactional mail).

---

## 2. The 30,000-Foot View

```
┌──────────────────────────── FRONTEND (React) ────────────────────────────┐
│   User Dashboard  (browse / buy / sell / stats)                          │
│   Admin Dashboard (password → mint / list / delete)                      │
└───────────────┬────────────────────────────────────────┬─────────────────┘
                │ REST + WebSocket                       │
                ▼                                        ▼
┌──────────────────────────── BACKEND (Rust / Axum) ───────────────────────┐
│  API Gateway  →  Auth  ·  NFT/Market  ·  Admin  ·  Pricing               │
│  Indexer  (Solana → Postgres)        Event Producers (emit events)       │
└───────┬───────────────┬───────────────────────────┬──────────────────────┘
        │               │                           │ emit events
        ▼               ▼                           ▼
   ┌─────────┐    ┌──────────┐            ┌────────────────────────┐
   │Postgres │    │  Redis   │            │   EVENT BUS (Kafka)    │
   │ (truth  │    │ cache +  │            │  user.logged_in        │
   │  cache) │    │ pub/sub  │            │  nft.purchased   ...   │
   └─────────┘    └──────────┘            └───────────┬────────────┘
        ▲                                  ┌──────────┼───────────┐
        │ index                            ▼          ▼           ▼
        │                            Email svc   Notification  Analytics
        │                            (sends      (future)      (future)
        │                             mail)
        ▼ sign & send tx
┌──────────────────────────── SOLANA DEVNET ────────────────────────────────┐
│  Anchor Program:  mint · snapshot · update_stats · list · buy · burn      │
└───────────────────────────────────────────────────────────────────────────┘
        ▲
        │ user signs
   ┌──────────┐        ┌─────────────────────┐
   │ Phantom  │        │ Football Stats API  │ → feeds the Oracle worker
   │  Wallet  │        │  (free/mock source) │
   └──────────┘        └─────────────────────┘
```

**One-sentence summary of the flow:** the frontend calls the backend → the backend reads fast data from Postgres/Redis and writes truth to Solana → important moments become _events_ on Kafka → small services (like email) react to those events.

---

## 3. Layer 1 — The Smart Contract (Anchor / Rust)

This is the **source of truth**. Even if our server dies, ownership is provable on-chain.

### What it stores (on-chain accounts / PDAs)

| Account             | Purpose                  | Key fields                                                      |
| ------------------- | ------------------------ | --------------------------------------------------------------- |
| `MarketplaceConfig` | Global settings          | admin authority, oracle authority, fee %                        |
| `PlayerNFT`         | One per minted NFT       | mint address, player_id, current_stats, owner, price, is_listed |
| `PurchaseSnapshot`  | Frozen stats at buy time | nft, buyer, stats_at_buy, bought_at (timestamp)                 |

> The `PurchaseSnapshot` is the heart of the "then vs. now" feature — and because it's on-chain, **nobody can fake it.**

### What it can do (instructions)

| Instruction       | Who can call              | What it does                                          |
| ----------------- | ------------------------- | ----------------------------------------------------- |
| `initialize`      | deployer                  | sets up MarketplaceConfig                             |
| `mint_player_nft` | **admin**                 | creates NFT + Metaplex metadata, seeds starting stats |
| `list` / `delist` | owner                     | put up for sale / remove                              |
| `buy`             | any user                  | escrow SOL → transfer NFT, **write PurchaseSnapshot** |
| `update_stats`    | **oracle authority only** | push fresh stats on-chain                             |
| `burn_nft`        | **admin**                 | "delete" an NFT                                       |

### Folder structure

```
program/
├── Anchor.toml                 # Anchor config (cluster = devnet)
├── Cargo.toml
├── programs/
│   └── xnft_market/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs          # program entrypoint, ties modules together
│           ├── state.rs        # account structs (MarketplaceConfig, PlayerNFT, PurchaseSnapshot)
│           ├── errors.rs       # custom error codes
│           └── instructions/
│               ├── mod.rs
│               ├── initialize.rs
│               ├── mint.rs
│               ├── market.rs   # list / delist / buy
│               ├── update_stats.rs
│               └── burn.rs
├── tests/
│   └── xnft_market.ts          # anchor test (mint → buy → update → assert)
└── migrations/
```

**Build & deploy:** `anchor build` → `anchor test` (local) → `anchor deploy` (devnet). Save the **Program ID** — the backend and frontend both need it.

---

## 4. Layer 2 — The Backend (Rust / Axum)

The backend is split into clear modules. Think of it as **one app, many responsibilities**, talking to Postgres (fast reads), Redis (cache/realtime), Solana (truth), and Kafka (events).

### Responsibilities

1. **Auth** — users (wallet + email), admin (password → JWT).
2. **NFT/Market API** — list NFTs, prices, snapshots, trigger buy/sell.
3. **Admin API** — mint/list/delete (JWT-gated).
4. **Indexer** — watches Solana, mirrors state into Postgres so the UI is instant.
5. **Oracle worker** — pulls football stats on a schedule → calls `update_stats` on-chain.
6. **Pricing engine** — adjusts price from demand signals.
7. **Event producers** — emit events to Kafka at key moments.

### Folder structure

```
backend/
├── Cargo.toml
├── .env                        # DB url, Redis url, Kafka brokers, RPC url, admin pass hash, JWT secret
├── migrations/                 # SQL migrations (sqlx)
└── src/
    ├── main.rs                 # boot: load config, start Axum + background workers
    ├── config.rs               # env → typed config
    ├── routes/
    │   ├── mod.rs              # router assembly
    │   ├── auth.rs            # POST /auth/login (user), /auth/admin/login
    │   ├── nfts.rs           # GET /nfts, GET /nfts/:id, GET /nfts/:id/history
    │   ├── market.rs         # POST /market/buy, /market/sell, /market/list
    │   └── admin.rs          # POST /admin/mint, DELETE /admin/nfts/:id  (JWT)
    ├── services/
    │   ├── solana.rs         # build/sign/send transactions to the program
    │   ├── indexer.rs        # poll chain → write Postgres
    │   ├── oracle.rs         # fetch stats → update_stats on-chain
    │   ├── pricing.rs        # demand → new price
    │   └── email.rs          # (consumer) send mail on events
    ├── events/
    │   ├── producer.rs       # publish to Kafka
    │   ├── consumer.rs       # subscribe + dispatch
    │   └── topics.rs         # event names + payload structs
    ├── db/
    │   ├── mod.rs
    │   └── models.rs         # Postgres row structs
    ├── cache.rs               # Redis helpers (get/set, pub/sub)
    ├── auth/
    │   ├── jwt.rs
    │   └── middleware.rs     # protects admin routes
    └── error.rs               # unified API errors
```

### API Endpoints — _where to do what_

**Auth**
| Method | Path | Auth | Does |
|---|---|---|---|
| POST | `/auth/login` | none | user logs in with email + wallet → **fires `user.logged_in` event** |
| POST | `/auth/admin/login` | none | password → returns JWT |

**NFTs (public reads — served from Postgres/Redis)**
| Method | Path | Does |
|---|---|---|
| GET | `/nfts` | list all listed NFTs (price, player, current stats) |
| GET | `/nfts/:id` | one NFT detail + "then vs. now" snapshot |
| GET | `/nfts/:id/history` | price history chart data |

**Market (actions — touch Solana)**
| Method | Path | Auth | Does |
|---|---|---|---|
| POST | `/market/buy` | user | build buy tx (user signs in wallet) → on confirm, **fires `nft.purchased`** |
| POST | `/market/sell` | user | list user's NFT for sale |
| POST | `/market/list` | user | set price / relist |

**Admin (all JWT-protected)**
| Method | Path | Does |
|---|---|---|
| POST | `/admin/mint` | mint a new player NFT → **fires `nft.minted`** |
| PATCH | `/admin/nfts/:id` | edit price/listing |
| DELETE | `/admin/nfts/:id` | burn / delist |
| GET | `/admin/nfts` | full list incl. unlisted |

**Realtime**
| Channel | Does |
|---|---|
| `WS /ws/prices` | pushes live price/stat updates to the UI (backed by Redis pub/sub) |

---

## 5. Layer 3 — The Event-Driven Backbone (Kafka + Redis)

**Why bother?** So services stay _decoupled_. The thing that _causes_ an event doesn't need to know who _reacts_. Want to add SMS alerts next month? Just add a new consumer — change nothing else. This is the "good architecture for future services" you asked for.

### How it flows

```
Something happens  ──►  Producer publishes event  ──►  Kafka topic  ──►  Consumers react
(user logs in /                                                          (Email, Notification,
 buys an NFT)                                                             Analytics, ...)
```

### Events (topics) we start with

| Event (topic)    | Emitted when                   | Who reacts            | Reaction                                 |
| ---------------- | ------------------------------ | --------------------- | ---------------------------------------- |
| `user.logged_in` | user signs in with email       | Email service         | send welcome / login-notice mail         |
| `nft.purchased`  | a `buy` tx confirms            | Email service         | send **receipt** with the stats snapshot |
| `nft.minted`     | admin mints                    | (future) Notification | announce "new drop"                      |
| `price.updated`  | pricing engine changes a price | (future) Analytics    | log demand trends                        |

### What Redis does (it wears 3 hats)

1. **Cache** — hot NFT prices/stats so pages load instantly (don't hammer the DB/RPC).
2. **Pub/Sub** — push live updates to the `WS /ws/prices` socket.
3. **Lightweight queue** — buffer background jobs if you don't want full Kafka in dev.

> **Broker choice:** start with **Kafka** if you want the distributed-systems flex on your resume; swap to **NATS** or **Redis Streams** if you'd rather stay lean and ship faster. The code in `events/` hides the broker behind a trait, so switching is a one-file change.

### The two email flows you asked for

**1) Login email**

```
POST /auth/login ─► verify email ─► producer.emit("user.logged_in", {email})
                                                │
                                                ▼
                          Email consumer ─► email.rs ─► send "Welcome / you just logged in"
```

_Async:_ the user isn't kept waiting while the mail sends.

**2) Purchase email**

```
buy tx confirms on-chain ─► producer.emit("nft.purchased", {buyer, nft, snapshot})
                                                │
                                                ▼
                  Email consumer ─► send receipt: player, price paid, "stats at purchase"
```

---

## 6. How a Real Action Flows End-to-End

**Scenario: a user buys the Haaland NFT**

1. User clicks **Buy** in the React **User Dashboard**.
2. Frontend calls `POST /market/buy`. Backend builds the Solana transaction.
3. **Phantom wallet** pops up; user signs. Tx goes to **devnet**, runs the `buy` instruction.
4. On-chain: SOL moves via escrow, NFT owner changes, a **`PurchaseSnapshot`** is written ("12 goals @ now").
5. **Indexer** sees the change → updates **Postgres**; **Redis** cache refreshed.
6. Backend **emits `nft.purchased`** to Kafka.
7. **Email service** consumes it → sends a receipt with the snapshot.
8. Later, the **Oracle worker** updates Haaland's stats on-chain → UI shows **"now 19 goals"** vs. the frozen 12.

---

## 7. Top-Level Repo Layout (everything together)

```
xnft-football/
├── program/          # Anchor smart contract (Section 3)
├── backend/          # Rust + Axum (Section 4)
├── frontend/         # React (Section 8)
├── docker-compose.yml# Postgres + Redis + Kafka for local dev
├── .env.example
└── README.md         # quickstart + architecture diagram
```

---

## 8. Layer 0 — The Frontend (React + Vite + TypeScript)

> **Stack:** React + **Vite** + **TypeScript**. This section explains _how_ to build the frontend: folder structure, what each file does, how the two dashboards work, how the wallet and backend connect, and the important gotchas.

### 8.1 Mental Model (read first)

The frontend is a **thin layer**. It never holds the truth — it just:

1. **Shows** data it fetches from the backend (`GET /nfts`, prices, stats).
2. **Asks the wallet to sign** transactions (buy/sell) — the _user_ signs, never us.
3. **Reacts live** to price/stat updates over a WebSocket.

> Golden rule: **the frontend asks, the backend & blockchain decide.** Keep business logic out of React.

### 8.2 Libraries

| Concern      | Choice                                      | Why                                         |
| ------------ | ------------------------------------------- | ------------------------------------------- |
| Build tool   | **Vite**                                    | instant dev server, fast builds             |
| Language     | **TypeScript**                              | type safety, looks pro in interviews        |
| Routing      | **react-router-dom**                        | client-side routes for the two dashboards   |
| Server state | **@tanstack/react-query**                   | caching + loading/error states for API data |
| Wallet       | **@solana/wallet-adapter-react** (+ `-ui`)  | Phantom connect button & signing            |
| Solana       | **@solana/web3.js** + **@coral-xyz/anchor** | talk to the program on devnet               |
| Charts       | **recharts**                                | the price-history chart                     |
| Styling      | **Tailwind CSS**                            | fast, clean UI                              |
| HTTP         | **axios**                                   | call the backend REST API                   |

### 8.3 Folder structure (what each file does)

```
frontend/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── .env                         # VITE_API_URL, VITE_WS_URL, VITE_PROGRAM_ID, VITE_RPC_URL
└── src/
    ├── main.tsx                 # app entry: mounts React, wraps providers
    ├── App.tsx                  # routes (user vs admin)
    │
    ├── providers/
    │   ├── WalletProvider.tsx   # Solana wallet adapter + Phantom config
    │   └── QueryProvider.tsx    # react-query client
    │
    ├── lib/
    │   ├── api.ts               # axios instance + typed backend calls
    │   ├── solana.ts            # connection + Anchor program client
    │   ├── ws.ts                # WebSocket for live prices
    │   └── types.ts             # shared TS types (Nft, Player, Snapshot, ...)
    │
    ├── hooks/
    │   ├── useNfts.ts           # react-query: GET /nfts
    │   ├── useNft.ts            # GET /nfts/:id (+ snapshot)
    │   ├── useBuy.ts            # build buy tx → wallet sign → POST confirm
    │   └── useAdmin.ts          # admin login + mint/delete (JWT)
    │
    ├── pages/
    │   ├── UserDashboard.tsx    # browse grid + filters
    │   ├── NftDetail.tsx        # one NFT, "then vs. now", buy/sell
    │   ├── AdminLogin.tsx       # password → JWT
    │   └── AdminDashboard.tsx   # mint form + manage table
    │
    ├── components/
    │   ├── Navbar.tsx           # logo + wallet connect button
    │   ├── NftCard.tsx          # photo, price, current stats, Buy
    │   ├── StatDiff.tsx         # ⭐ "then vs. now" widget
    │   ├── PriceChart.tsx       # recharts price history
    │   ├── BuyButton.tsx        # triggers wallet signing flow
    │   ├── MintForm.tsx         # admin: create new NFT
    │   └── ProtectedRoute.tsx   # blocks admin pages without JWT
    │
    └── styles/
        └── index.css            # Tailwind directives
```

### 8.4 How the app boots (provider order matters)

`main.tsx` wraps the app — outer wraps inner:

```
<QueryProvider>          ← react-query (data caching)
  <WalletProvider>       ← Solana wallet (Phantom)
    <BrowserRouter>      ← routing
      <App />
    </BrowserRouter>
  </WalletProvider>
</QueryProvider>
```

`App.tsx` routes:

```
/                → UserDashboard
/nft/:id         → NftDetail
/admin/login     → AdminLogin
/admin           → ProtectedRoute → AdminDashboard
```

### 8.5 User Dashboard — how it works

1. `useNfts()` calls `GET /nfts` (react-query caches it).
2. Render a grid of `<NftCard />` — player photo, **current stats**, price, **Buy** button.
3. `ws.ts` opens `WS /ws/prices`; on update, refresh the cache so cards re-render live.
4. Click a card → `/nft/:id` → `<NftDetail />`.

**NftDetail** holds the magic feature:

- **`<StatDiff />`**: _"When you bought: 12 goals → Now: 19 goals (+7)."_
- **`<PriceChart />`** (price history).
- **Buy/Sell** via `<BuyButton />`.

**Buy flow (user signs, not us):**

```
Click Buy
  → useBuy() asks backend to build the tx (POST /market/buy)
  → wallet adapter prompts Phantom → USER signs
  → signed tx sent to devnet
  → on confirm, notify backend → react-query refetches → UI updates
```

### 8.6 Admin Dashboard — how it works

1. `/admin/login` → password → `POST /auth/admin/login` → returns **JWT**.
2. Store JWT in memory/React state (see gotchas).
3. `<ProtectedRoute />` checks JWT; none → redirect to login.
4. `AdminDashboard`:
   - **`<MintForm />`** → `POST /admin/mint`.
   - **Manage table** → **Edit** (`PATCH`) + **Delete** (`DELETE /admin/nfts/:id`).
5. Every admin request sends `Authorization: Bearer <JWT>`.

### 8.7 Talking to the backend — `lib/api.ts`

Central axios instance so every call shares config + auth header:

```
api.get('/nfts')                       → list NFTs
api.get(`/nfts/${id}`)                 → detail + snapshot
api.get(`/nfts/${id}/history`)         → price chart data
api.post('/market/buy', { nftId })     → build buy tx
api.post('/auth/login', { email })     → user login (fires email event server-side)
api.post('/auth/admin/login', { pwd }) → admin JWT
api.post('/admin/mint', payload)       → mint  (JWT)
api.delete(`/admin/nfts/${id}`)        → burn  (JWT)
```

Use a **request interceptor** to attach the JWT automatically on admin calls.

### 8.8 Live updates — `lib/ws.ts`

- Open `WS /ws/prices` on app load.
- On message `{ nftId, price, stats }`, update the react-query cache → instant re-render.
- Reconnect on drop (simple exponential backoff).

### 8.9 Important details & gotchas

- **Never put on-chain logic in the frontend.** The frontend builds/asks; the program enforces.
- **The user always signs.** We never hold private keys — Phantom handles signing.
- **Env vars** must be prefixed `VITE_` to be exposed (Vite rule).
- **JWT storage:** prefer in-memory; `localStorage` is vulnerable to XSS (fine for a demo, but mention the trade-off in the interview).
- **Devnet only:** point `VITE_RPC_URL` at devnet; use a devnet wallet with airdropped SOL.
- **Loading/error states:** react-query gives these free — show spinners/empty states so the demo looks polished.
- **Type everything:** define `Nft`, `Player`, `PurchaseSnapshot` in `lib/types.ts` and reuse.
- **Optimistic UI:** grey out the Buy button while the tx confirms.

### 8.10 Frontend build order

1. Scaffold: `npm create vite@latest frontend -- --template react-ts`, add Tailwind + libs.
2. Providers + routing (`main.tsx`, `App.tsx`).
3. Wallet connect in `Navbar` (prove Phantom connects to devnet).
4. User Dashboard with `useNfts` (mock data first, swap to real API later).
5. NftDetail + ⭐ `StatDiff` + price chart.
6. Buy flow (wallet signing).
7. Admin login + ProtectedRoute + MintForm + manage table.
8. WebSocket live updates.
9. Polish: loading/empty states, responsive layout.

> Build the **whole UI against mock data first** so it looks finished, then replace mock calls in `lib/api.ts` with the real backend one by one.

---

## 9. Build Order (so you actually finish)

1. **Smart contract** (Section 3) — hardest + most impressive, do first. Test, deploy to devnet.
2. **Backend core** (Section 4) — Axum + Postgres + indexer + auth.
3. **Event layer** (Section 5) — Kafka/Redis + email service (login + purchase mails).
4. **Frontend** (Section 8) — user dashboard, then admin.
5. **Polish + verify** — seed demo players, run mint → buy → update → resell end-to-end. README + whiteboard diagram.

**✅ Must-have:** mint, buy/sell, dynamic stats, then-vs-now, admin CRUD, wallet connect, login + purchase emails.
**⏭️ More context needed:** compressed NFTs, decentralized oracle, royalties, real stats license, SMS/push.
