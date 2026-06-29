import type { ReactNode } from "react";
import styles from "./layout.module.css";

/** Centers the auth card on a full-height canvas. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className={styles.shell}>{children}</main>;
}
