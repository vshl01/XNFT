/**
 * Transport-level envelopes shared by the API and clients. Every endpoint
 * responds with either an `ApiSuccess<T>` or an `ApiError`, so the frontend
 * can discriminate on `success` without guessing per-route shapes.
 */

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    /** Stable machine-readable code, e.g. "INVALID_CREDENTIALS". */
    code: string;
    /** Human-readable message safe to surface to end users. */
    message: string;
    /** Optional field-level validation errors keyed by field name. */
    details?: Record<string, string[]>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
