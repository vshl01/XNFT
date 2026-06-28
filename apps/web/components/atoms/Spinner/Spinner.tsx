import styles from "./Spinner.module.css";

interface SpinnerProps {
  size?: number;
}

/** Atom: indeterminate loading indicator. */
export function Spinner({ size = 20 }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
