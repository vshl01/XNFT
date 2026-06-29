"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@repo/types";
import { useAuth } from "../../../lib/auth/auth-context";
import { ApiClientError } from "../../../lib/api/client";
import { validateWith, type FieldErrors } from "../../../lib/forms/validate";
import { FormField } from "../../molecules/FormField/FormField";
import { PasswordField } from "../../molecules/PasswordField/PasswordField";
import { Button } from "../../atoms/Button/Button";
import { Alert } from "../../atoms/Alert/Alert";
import styles from "../shared/authForm.module.css";

const EMPTY: RegisterInput = { displayName: "", email: "", password: "" };

/** Organism: the registration form. */
export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [values, setValues] = useState<RegisterInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof RegisterInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = validateWith(registerSchema, values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);
    try {
      await register(result.data!);
      router.push("/dashboard");
    } catch (error) {
      if (error instanceof ApiClientError && error.details) {
        // Surface backend field-level errors (e.g. email already taken).
        const mapped: FieldErrors<RegisterInput> = {};
        for (const [key, messages] of Object.entries(error.details)) {
          if (messages[0]) mapped[key as keyof RegisterInput] = messages[0];
        }
        setErrors(mapped);
      }
      setFormError(
        error instanceof ApiClientError
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Alert message={formError} />
      <FormField
        id="displayName"
        label="Name"
        autoComplete="name"
        placeholder="Your name"
        value={values.displayName}
        error={errors.displayName}
        onChange={(e) => update("displayName", e.target.value)}
      />
      <FormField
        id="email"
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={values.email}
        error={errors.email}
        onChange={(e) => update("email", e.target.value)}
      />
      <PasswordField
        id="password"
        label="Password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        value={values.password}
        error={errors.password}
        onChange={(e) => update("password", e.target.value)}
      />
      <Button
        type="submit"
        fullWidth
        isLoading={submitting}
        className={styles.submit}
      >
        Create account
      </Button>
    </form>
  );
}
