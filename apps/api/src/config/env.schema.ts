import { z } from "zod";

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  // Database (Supabase PostgreSQL)
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  DIRECT_URL: z.string().url().startsWith("postgresql://").optional(),

  // Redis (optional in Phase 0, required from Phase 3)
  REDIS_URL: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRATION: z.string().default("15m"),
  JWT_REFRESH_EXPIRATION: z.string().default("7d"),

  // CORS
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Sentry (optional - auto-disabled when not set)
  SENTRY_DSN: z.string().url().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Resend (optional - mock when not set)
  RESEND_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;
