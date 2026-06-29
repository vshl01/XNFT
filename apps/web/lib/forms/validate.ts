import type { z, ZodTypeAny } from "zod";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

interface ValidateResult<T> {
  success: boolean;
  data?: T;
  errors: FieldErrors<T>;
}

/**
 * Validate form values against a shared zod schema (the same one the backend
 * uses) and flatten to the first message per field for inline display.
 */
export function validateWith<TSchema extends ZodTypeAny>(
  schema: TSchema,
  values: unknown,
): ValidateResult<z.infer<TSchema>> {
  const result = schema.safeParse(values);
  if (result.success) {
    return { success: true, data: result.data, errors: {} };
  }

  const fieldErrors = result.error.flatten().fieldErrors;
  const errors: FieldErrors<z.infer<TSchema>> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      errors[key as keyof z.infer<TSchema>] = messages[0];
    }
  }
  return { success: false, errors };
}
