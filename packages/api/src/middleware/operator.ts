import { isOperatorEmailAllowlisted } from "@my-better-t-app/auth/allowlist";
import { getUserById } from "@my-better-t-app/db/queries/users";
import { env } from "@my-better-t-app/env/server";
import { ORPCError } from "@orpc/server";

import { o } from "../procedure.js";

export type OperatorSession = {
  user: {
    email: string;
    id: string;
  };
} | null;

export type OperatorActor = {
  email: string;
  id: string;
  name: string;
};

type FindUser = typeof getUserById;

export async function authorizeOperator(
  session: OperatorSession,
  allowlist: readonly string[],
  findUser: FindUser = getUserById,
): Promise<OperatorActor> {
  if (!session?.user) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Sign in is required.",
    });
  }

  if (!isOperatorEmailAllowlisted(session.user.email, allowlist)) {
    throw new ORPCError("FORBIDDEN", {
      message: "Operator access is not authorized.",
    });
  }

  const user = await findUser(session.user.id);
  if (!user || user.email.toLowerCase() !== session.user.email.toLowerCase()) {
    throw new ORPCError("FORBIDDEN", {
      message: "Operator access is not active.",
    });
  }

  return {
    email: user.email,
    id: user.id,
    name: user.name,
  };
}

export const requireOperator = o.middleware(async ({ context, next }) => {
  const actor = await authorizeOperator(
    context.session,
    env.OPERATOR_EMAIL_ALLOWLIST,
  );

  return next({
    context: {
      actor,
    },
  });
});
