import { auth } from "@my-better-t-app/auth";
import type { Context as HonoContext } from "hono";

import type { SafeRequestLogger } from "./services/logging.js";

export type CreateContextOptions = {
  context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
  const requestContext = context as HonoContext<{
    Variables: {
      log: SafeRequestLogger;
      requestId: string;
    };
  }>;
  const session = await auth.api.getSession({
    headers: context.req.raw.headers,
  });

  return {
    log: requestContext.get("log"),
    requestId: requestContext.get("requestId"),
    session: session?.user
      ? {
          user: {
            email: session.user.email,
            id: session.user.id,
          },
        }
      : null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
