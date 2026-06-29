import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./AuthCard.module.css";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: { prompt: string; linkLabel: string; href: string };
}

/** Organism: the glass auth card shell shared by login & register. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.brand}>
        <span className={styles.mark}>✦</span>
        <span className={styles.brandName}>XNFT</span>
      </div>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      <div className={styles.body}>{children}</div>
      <p className={styles.footer}>
        {footer.prompt}{" "}
        <Link href={footer.href} className={styles.link}>
          {footer.linkLabel}
        </Link>
      </p>
    </div>
  );
}
