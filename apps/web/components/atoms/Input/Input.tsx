import { forwardRef, type InputHTMLAttributes } from "react";
import styles from "./Input.module.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/** Atom: styled text input. Forwards ref for focus management. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError = false, className, ...props },
  ref,
) {
  const classes = [styles.input, hasError ? styles.error : "", className ?? ""]
    .filter(Boolean)
    .join(" ");
  return <input ref={ref} className={classes} aria-invalid={hasError} {...props} />;
});
