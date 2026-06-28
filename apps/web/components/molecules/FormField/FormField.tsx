import { type InputHTMLAttributes } from "react";
import { Input } from "../../atoms/Input/Input";
import { Label } from "../../atoms/Label/Label";
import { FieldError } from "../../atoms/FieldError/FieldError";
import styles from "./FormField.module.css";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
}

/** Molecule: label + input + error, composed from atoms. */
export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} hasError={Boolean(error)} {...inputProps} />
      <FieldError message={error} />
    </div>
  );
}
