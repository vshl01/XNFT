import styles from "./Alert.module.css";

/** Atom: form-level feedback banner (e.g. "Invalid email or password"). */
export function Alert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div className={styles.alert} role="alert">
      {message}
    </div>
  );
}
