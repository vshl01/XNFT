import type { ReactNode } from "react";
import Link from "next/link";

/** Admin dashboard shell — sticky top bar + content container. Responsive. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-linear-to-br from-accent to-accent-2 text-sm font-bold text-black">
              ✦
            </span>
            <span className="text-sm font-bold tracking-widest">
              XNFT <span className="text-muted">ADMIN</span>
            </span>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/admin/nft"
              className="rounded-lg px-3 py-1.5 font-medium text-text transition hover:bg-white/5"
            >
              Launch NFT
            </Link>
            <Link
              href="/"
              className="rounded-lg px-3 py-1.5 font-medium text-muted transition hover:bg-white/5 hover:text-text"
            >
              Exit
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
