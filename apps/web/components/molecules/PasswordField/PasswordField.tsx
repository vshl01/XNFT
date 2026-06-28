"use client";

import { useState, type InputHTMLAttributes } from "react";
import { Input } from "../../atoms/Input/Input";
import { Label } from "../../atoms/Label/Label";
import { FieldError } from "../../atoms/FieldError/FieldError";
import styles from "./PasswordField.module.css";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  id: string;
  label: string;
  error?: string;
}

/** Molecule: password input with a show/hide toggle. */
export function PasswordField({
  id,
  label,
  error,
  ...inputProps
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <div className={styles.wrapper}>
        <Input
          id={id}
          type={visible ? "text" : "password"}
          hasError={Boolean(error)}
          {...inputProps}
        />
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
      <FieldError message={error} />
    </div>
  );
}
