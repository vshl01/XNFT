"use client";

import Link from "next/link";
import { useAuth } from "../lib/auth/auth-context";
import { Button } from "../components/atoms/Button/Button";
import styles from "./home.module.css";

export default function Home() {
  const { status } = useAuth();
  const authed = status === "authenticated";

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <span className={styles.brand}>
          <span className={styles.mark}>✦</span> XNFT
        </span>
        <div className={styles.ctas}>
          <Link href="/market">
            <Button variant="ghost">Marketplace</Button>
          </Link>
          <Link href={authed ? "/dashboard" : "/login"}>
            <Button variant="ghost">{authed ? "Dashboard" : "Sign in"}</Button>
          </Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <span className={styles.pill}>Dynamic football NFTs on Solana</span>
        <h1 className={styles.title}>
          Own the players. <span className={styles.accent}>Watch them grow.</span>
        </h1>
        <p className={styles.lede}>
          Each xNFT is tied to a real footballer and updates itself with live
          stats. Buy, sell, and track your collection as the season unfolds.
        </p>
        <div className={styles.ctas}>
          <Link href={authed ? "/dashboard" : "/register"}>
            <Button>{authed ? "Go to dashboard" : "Get started"}</Button>
          </Link>
          {!authed && (
            <Link href="/login">
              <Button variant="ghost">I have an account</Button>
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
