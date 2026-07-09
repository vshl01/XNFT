import type { ReactNode } from "react";
import { SolanaWalletProvider } from "../../lib/solana/WalletProvider";

/** Scopes the Solana wallet context to the marketplace route only. */
export default function MarketLayout({ children }: { children: ReactNode }) {
  return <SolanaWalletProvider>{children}</SolanaWalletProvider>;
}
