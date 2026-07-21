import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const isProduction = process.env.NODE_ENV === "production";

function booleanString(defaultValue: "true" | "false") {
  return z
    .enum(["true", "false"])
    .default(defaultValue)
    .transform((value) => value === "true");
}

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

export const env = createEnv({
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
    RELIEFWEB_APP_NAME: z.string().trim().min(3).optional(),
    CRON_SECRET: z.string().min(16).optional(),
    MONITORING_ENABLED: booleanString("false"),
    LIVE_OUTREACH_ENABLED: booleanString("false"),
    VOICE_ENABLED: booleanString("false"),
    PILOT_DISTRICTS: z
      .string()
      .default("Cox's Bazar,Chattogram")
      .transform((value) =>
        value
          .split(",")
          .map((district) => district.trim())
          .filter(Boolean),
      ),
    VAPI_API_KEY: z.string().trim().min(1).optional(),
    VAPI_PHONE_NUMBER_ID: z.string().trim().min(1).optional(),
    VAPI_WEBHOOK_SECRET: z.string().min(16).optional(),
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
    DEMO_MODE: booleanString("true"),
  },
  runtimeEnv: process.env,
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
