import { auth } from "@my-better-t-app/auth";
import type { Context as HonoContext } from "hono";

import type { SafeRequestLogger } from "./services/logging";

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
    auth: null,
    log: requestContext.get("log"),
    requestId: requestContext.get("requestId"),
    session,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
