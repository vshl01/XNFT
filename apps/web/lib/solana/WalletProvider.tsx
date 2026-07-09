"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { RPC_URL } from "./config";

// Default styles for the wallet-adapter modal + connect button.
import "@solana/wallet-adapter-react-ui/styles.css";

/**
 * Wraps the tree with Solana wallet context. We pass NO explicit wallet
 * adapters: any wallet that implements the Wallet Standard (Phantom, Solflare,
 * Backpack, …) auto-registers, so the modal lists whatever the user has
 * installed and any of them can sign.
 */
export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
