import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function getVercelOrigin() {
  const vercelUrl =
    process.env.VERCEL_ENV === "production"
      ? (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL)
      : (process.env.VERCEL_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (!vercelUrl) return undefined;
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
}

const vercelOrigin = getVercelOrigin();

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

export function parseOperatorAllowlist(value: string | undefined) {
  if (!value) return [];

  return [
    ...new Set(
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

const runtimeEnv = {
  ...process.env,
  // Public auth base: /api/auth bypasses the rewrite's path strip, so the
  // same URL works for incoming matching and generated callbacks
  BETTER_AUTH_URL:
    process.env.BETTER_AUTH_URL ??
    (vercelOrigin ? `${vercelOrigin}/api/auth` : undefined),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? vercelOrigin,
};

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    OPERATOR_EMAIL_ALLOWLIST: z
      .string()
      .optional()
      .transform(parseOperatorAllowlist),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().min(1).optional(),
    OPENROUTER_APP_NAME: z
      .string()
      .min(1)
      .default("rapid-humanitarian-response"),
    OPENROUTER_APP_URL: z.url().optional(),
    TURNSTILE_SECRET_KEY: z.string().min(1).optional(),
    DEMO_MODE: booleanString,
  },
  runtimeEnv: runtimeEnv,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

if (env.NODE_ENV === "production") {
  const missingVariables = [
    env.OPERATOR_EMAIL_ALLOWLIST.length === 0
      ? "OPERATOR_EMAIL_ALLOWLIST"
      : undefined,
    !env.OPENROUTER_API_KEY ? "OPENROUTER_API_KEY" : undefined,
    !env.OPENROUTER_MODEL ? "OPENROUTER_MODEL" : undefined,
    !env.TURNSTILE_SECRET_KEY ? "TURNSTILE_SECRET_KEY" : undefined,
  ].filter((value): value is string => value !== undefined);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missingVariables.join(", ")}`,
    );
  }
}
