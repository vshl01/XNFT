"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@repo/types";
import { useAuth } from "../../../lib/auth/auth-context";
import { ApiClientError } from "../../../lib/api/client";
import { validateWith, type FieldErrors } from "../../../lib/forms/validate";
import { FormField } from "../../molecules/FormField/FormField";
import { PasswordField } from "../../molecules/PasswordField/PasswordField";
import { Button } from "../../atoms/Button/Button";
import { Alert } from "../../atoms/Alert/Alert";
import styles from "../shared/authForm.module.css";

const EMPTY: LoginInput = { email: "", password: "" };

/** Organism: the login form. Owns validation, submission, and error state. */
export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [values, setValues] = useState<LoginInput>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof LoginInput, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const result = validateWith(loginSchema, values);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }

    setSubmitting(true);
    try {
      await login(result.data!);
      router.push("/dashboard");
    } catch (error) {
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
        autoComplete="current-password"
        placeholder="Your password"
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
        Sign in
      </Button>
    </form>
  );
}
