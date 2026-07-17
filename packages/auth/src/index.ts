import { createDb } from "@my-better-t-app/db";
import * as schema from "@my-better-t-app/db/schema/auth";
import { env } from "@my-better-t-app/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { createAuthMiddleware } from "better-auth/api";

import { requireAllowlistedOperatorEmail } from "./allowlist";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",

      schema: schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path !== "/sign-up/email") return;

        requireAllowlistedOperatorEmail(
          context.body?.email,
          env.OPERATOR_EMAIL_ALLOWLIST,
        );
      }),
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      defaultCookieAttributes: {
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        secure: env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    plugins: [],
  });
}

export const auth = createAuth();
