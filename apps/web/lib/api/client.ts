import type { ApiResponse } from "@repo/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * In-memory access token store. We deliberately do NOT persist the access
 * token to localStorage (XSS-exposed); it lives only in JS memory and is
 * re-minted from the httpOnly refresh cookie on page load.
 */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/** Thrown for any non-success API response; carries the structured error. */
export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, string[]>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Attach the bearer access token and auto-refresh on expiry. */
  auth?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  _retried?: boolean;
}

async function parse<T>(res: Response): Promise<ApiResponse<T>> {
  return (await res.json()) as ApiResponse<T>;
}

/**
 * Low-level fetch wrapper. Always sends cookies (for the refresh token),
 * attaches the bearer token when `auth` is set, and transparently refreshes
 * the access token once on a 401/expired response before retrying.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, auth, _retried, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(auth && accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const json = await parse<T>(res);

  if (json.success) {
    return json.data;
  }

  // Access token expired — refresh once, then retry the original request.
  if (
    auth &&
    !_retried &&
    res.status === 401 &&
    json.error.code === "TOKEN_EXPIRED"
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return apiFetch<T>(path, { ...options, _retried: true });
    }
  }

  throw new ApiClientError(
    res.status,
    json.error.code,
    json.error.message,
    json.error.details,
  );
}

/** Hit the refresh endpoint (cookie-based) and update the in-memory token. */
async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    const json = await parse<{ tokens: { accessToken: string } }>(res);
    if (json.success) {
      accessToken = json.data.tokens.accessToken;
      return true;
    }
  } catch {
    // fall through
  }
  accessToken = null;
  return false;
}
