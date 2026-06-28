import type { LabelHTMLAttributes } from "react";
import styles from "./Label.module.css";

/** Atom: form field label. */
export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={[styles.label, className ?? ""].join(" ")} {...props}>
      {children}
    </label>
  );
}
