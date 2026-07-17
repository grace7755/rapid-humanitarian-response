import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const serverUrlSchema = z.union([
  z.url(),
  z
    .string()
    .regex(/^\/(?!\/)/, "Use an absolute URL or a same-origin path like /api"),
]);

const booleanString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const runtimeEnv = (
  import.meta as ImportMeta & {
    readonly env: Record<string, boolean | string | undefined>;
  }
).env;

const isProductionBuild =
  runtimeEnv.PROD === true || runtimeEnv.MODE === "production";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_SERVER_URL: serverUrlSchema,
    VITE_TURNSTILE_SITE_KEY: z
      .string()
      .trim()
      .min(1)
      .optional()
      .superRefine((value, context) => {
        if (isProductionBuild && !value) {
          context.addIssue({
            code: "custom",
            message: "Required for production builds",
          });
        }
      }),
    VITE_APP_NAME: z.string().min(1).default("Rapid Humanitarian Response"),
    VITE_GITHUB_URL: z.url().optional(),
    VITE_DEMO_MODE: booleanString,
  },
  runtimeEnv,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
