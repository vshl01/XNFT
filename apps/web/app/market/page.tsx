"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { nftApi, type MarketNft } from "../../lib/api/nft.api";
import { LAMPORTS_PER_SOL } from "../../lib/solana/config";
import { buyNft } from "../../lib/solana/marketplace";

const toSol = (lamports: string) => Number(lamports) / LAMPORTS_PER_SOL;

export default function MarketPage() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();

  const [nfts, setNfts] = useState<MarketNft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Per-mint status: which one is buying, and the last result message.
  const [busyMint, setBusyMint] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    nftApi
      .list()
      .then(setNfts)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleBuy(nft: MarketNft) {
    if (!publicKey || !signTransaction) return;
    setBusyMint(nft.mintAddress);
    setNotice(null);
    try {
      const sig = await buyNft({
        connection,
        buyer: publicKey,
        mintAddress: nft.mintAddress,
        signTransaction,
      });
      setNotice(`✅ Bought "${nft.name}". Tx: ${sig.slice(0, 8)}…`);
      load(); // refresh the gallery
    } catch (e) {
      setNotice(`❌ ${e instanceof Error ? e.message : "Purchase failed"}`);
    } finally {
      setBusyMint(null);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-[1080px] p-6">
      <nav className="flex items-center justify-between py-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold tracking-[0.06em]"
        >
          <span className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-[image:var(--gradient)] text-[0.85rem] text-[var(--accent-contrast)]">
            ✦
          </span>{" "}
          XNFT
        </Link>
        <WalletMultiButton />
      </nav>

      <header className="max-w-[640px] pt-8 pb-6">
        <h1 className="text-[clamp(2rem,5vw,2.8rem)] font-extrabold tracking-[-0.025em]">
          Marketplace
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          Connect a wallet and buy a listed NFT. Purchases settle on Solana
          devnet — you&apos;ll need devnet SOL.
        </p>
      </header>

      {notice && (
        <div className="mt-2 mb-6 rounded-[12px] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm break-all">
          {notice}
        </div>
      )}

      {loading && <p className="py-4 text-muted">Loading listings…</p>}
      {error && <p className="py-4 text-danger">{error}</p>}
      {!loading && !error && nfts.length === 0 && (
        <p className="py-4 text-muted">No NFTs have been minted yet.</p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5 pb-16">
        {nfts.map((nft) => {
          const sold = nft.status !== "LISTED";
          const isBusy = busyMint === nft.mintAddress;
          return (
            <article
              key={nft.mintAddress}
              className="overflow-hidden rounded-card border border-[var(--border)] bg-[var(--surface)] transition-colors hover:border-[var(--border-strong)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="block aspect-square w-full bg-bg-elevated object-cover"
                src={nft.image}
                alt={nft.name}
              />
              <div className="p-4">
                <h2 className="text-[1.05rem] font-bold">{nft.name}</h2>
                <p className="mt-1 font-mono text-[0.78rem] text-[var(--text-faint)]">
                  {nft.mintAddress.slice(0, 4)}…{nft.mintAddress.slice(-4)}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-[1.05rem] font-bold">
                    {toSol(nft.priceLamports)} SOL
                  </span>
                  <button
                    className="cursor-pointer rounded-[12px] bg-[image:var(--gradient)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={sold || isBusy || !publicKey}
                    onClick={() => handleBuy(nft)}
                  >
                    {sold
                      ? nft.status === "SOLD"
                        ? "Sold"
                        : "Delisted"
                      : isBusy
                        ? "Buying…"
                        : !publicKey
                          ? "Connect wallet"
                          : "Buy"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
