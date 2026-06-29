"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { Button } from "../../components/atoms/Button/Button";
import { Spinner } from "../../components/atoms/Spinner/Spinner";
import styles from "./dashboard.module.css";

/** Protected page: redirects to /login unless authenticated. */
export default function DashboardPage() {
  const router = useRouter();
  const { user, status, logout } = useAuth();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <main className={styles.center}>
        <Spinner size={28} />
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <div className={styles.card}>
        <span className={styles.badge}>Authenticated</span>
        <h1 className={styles.title}>
          Welcome, {user.displayName.split(" ")[0]}.
        </h1>
        <p className={styles.subtitle}>
          Your session is live. The marketplace lands in the next phase.
        </p>

        <dl className={styles.meta}>
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
          </div>
        </dl>

        <Button variant="ghost" onClick={() => void logout()}>
          Sign out
        </Button>
      </div>
    </main>
  );
}
