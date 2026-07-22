import { isObserverEmailAllowlisted } from "@my-better-t-app/auth/allowlist";
import { getUserById } from "@my-better-t-app/db/queries/users";
import { env } from "@my-better-t-app/env/server";
import { ORPCError } from "@orpc/server";

import { o } from "../procedure.js";

export type ObserverSession = { user: { email: string; id: string } } | null;
export type ObserverActor = { email: string; id: string; name: string };

export async function authorizeObserver(
  session: ObserverSession,
  allowlist: readonly string[],
  findUser: typeof getUserById = getUserById,
): Promise<ObserverActor> {
  if (!session?.user)
    throw new ORPCError("UNAUTHORIZED", { message: "Sign in is required." });
  if (!isObserverEmailAllowlisted(session.user.email, allowlist)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Observer access is not authorized.",
    });
  }
  const user = await findUser(session.user.id);
  if (!user || user.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new ORPCError("FORBIDDEN", {
      message: "Observer access is not active.",
    });
  }
  return { email: user.email, id: user.id, name: user.name };
}

export const requireObserver = o.middleware(async ({ context, next }) => {
  const actor = await authorizeObserver(
    context.session,
    env.OBSERVER_EMAIL_ALLOWLIST,
  );
  return next({ context: { actor } });
});
