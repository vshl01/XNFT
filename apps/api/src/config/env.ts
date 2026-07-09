import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load .env before reading process.env. In production the platform injects
// real env vars, so a missing file is not an error.
loadDotenv();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:3000")
    .transform((value) => value.split(",").map((origin) => origin.trim())),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET must be set"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be set"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL: z.string().default("7d"),

  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z
    .string()
    .default("false")
    .transform((value) => value === "true"),

  // ─── Solana / on-chain ────────────────────────────────────────────────
  SOLANA_RPC_URL: z.string().url().default("https://api.devnet.solana.com"),
  // The deployed marketplace program id (matches the contract's declare_id!).
  PROGRAM_ID: z.string().default("Gbd3BXqzgMW5xMHp3LEER1SfHaAQ2Kgu7wb16efHaTso"),
  // Admin wallet — signs mint/initialize/update on-chain. Optional at boot;
  // the Solana service validates them when an on-chain action is invoked.
  PUB_KEY: z.string().optional(),
  PVT_KEY: z.string().optional(),
  // Public base URL of THIS api, used to build the on-chain metadata `uri`.
  API_PUBLIC_URL: z.string().url().default("http://localhost:4000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loudly — a misconfigured server should never boot.
  console.error(
    "❌ Invalid environment variables:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
