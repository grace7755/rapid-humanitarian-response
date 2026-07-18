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
const isProduction = process.env.NODE_ENV === "production";

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
  // Keep Vercel's function compiler from widening the omitted prefix to string.
  clientPrefix: "",
  client: {},
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
      .transform(parseOperatorAllowlist)
      .superRefine((value, context) => {
        if (isProduction && value.length === 0) {
          context.addIssue({
            code: "custom",
            message: "Required in production",
          });
        }
      }),
    OPENROUTER_API_KEY: z.string().min(1).optional(),
    OPENROUTER_MODEL: z.string().min(1).optional(),
    OPENROUTER_APP_NAME: z
      .string()
      .min(1)
      .default("rapid-humanitarian-response"),
    OPENROUTER_APP_URL: z.url().optional(),
    TURNSTILE_SECRET_KEY: z
      .string()
      .trim()
      .min(1)
      .optional()
      .superRefine((value, context) => {
        if (isProduction && !value) {
          context.addIssue({
            code: "custom",
            message: "Required in production",
          });
        }
      }),
    DEMO_MODE: booleanString,
  },
  runtimeEnv: runtimeEnv,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
  onValidationError: (issues) => {
    const invalidVariables = issues.map(
      (issue) =>
        issue.path
          ?.map((segment) =>
            typeof segment === "object" && segment !== null && "key" in segment
              ? String(segment.key)
              : String(segment),
          )
          .join(".") ?? "unknown",
    );
    const error = new Error(
      `Invalid server environment variables: ${invalidVariables.join(", ")}`,
      { cause: issues },
    );
    console.error("[server] Startup environment validation failed", error);
    throw error;
  },
});
