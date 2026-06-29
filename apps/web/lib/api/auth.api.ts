import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "@repo/types";
import { apiFetch, setAccessToken } from "./client";

/**
 * Auth API surface. Each call keeps the in-memory access token in sync, so the
 * rest of the app only ever reads it through the client.
 */
export const authApi = {
  async register(input: RegisterInput): Promise<AuthSession> {
    const session = await apiFetch<AuthSession>("/auth/register", {
      method: "POST",
      body: input,
    });
    setAccessToken(session.tokens.accessToken);
    return session;
  },

  async login(input: LoginInput): Promise<AuthSession> {
    const session = await apiFetch<AuthSession>("/auth/login", {
      method: "POST",
      body: input,
    });
    setAccessToken(session.tokens.accessToken);
    return session;
  },

  /** Restore a session on app load from the httpOnly refresh cookie. */
  async restore(): Promise<AuthSession | null> {
    try {
      const session = await apiFetch<AuthSession>("/auth/refresh", {
        method: "POST",
      });
      setAccessToken(session.tokens.accessToken);
      return session;
    } catch {
      setAccessToken(null);
      return null;
    }
  },

  me(): Promise<AuthUser> {
    return apiFetch<AuthUser>("/auth/me", { method: "GET", auth: true });
  },

  async logout(): Promise<void> {
    try {
      await apiFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
    }
  },
};
