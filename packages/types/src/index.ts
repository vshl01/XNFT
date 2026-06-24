// Shared types for the XNFT monorepo.
// Consumed as a just-in-time package: apps import from `@repo/types`
// (or `@repo/types/<file>`) and transpile the source directly.
//
// NOTE: use EXPLICIT named re-exports here (not `export *`). The backend runs
// this source through tsx (CommonJS interop), and `export *` chains hide names
// from the CJS lexer — breaking `import { loginSchema } from "@repo/types"`.
// Extensionless paths keep Next/Turbopack's bundler resolver happy too.

export type { ApiSuccess, ApiError, ApiResponse } from "./http";

export {
  emailSchema,
  passwordSchema,
  displayNameSchema,
  registerSchema,
  loginSchema,
  refreshSchema,
} from "./auth/auth.schema";

export type {
  RegisterInput,
  LoginInput,
  RefreshInput,
  AuthUser,
  AuthTokens,
  AuthSession,
  AccessTokenClaims,
} from "./auth/auth.types";
