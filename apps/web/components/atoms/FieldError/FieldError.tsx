import styles from "./FieldError.module.css";

/** Atom: inline validation message under a field. Renders nothing if empty. */
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
