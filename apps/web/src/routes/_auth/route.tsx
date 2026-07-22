import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { ObserverHeader } from "@/components/header";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({
        to: "/sign-in",
      });
    }
    return { session };
  },
});

function AuthLayout() {
  const { session } = Route.useRouteContext();
  if (!session.data) return null;

  return (
    <div className="grid h-full grid-rows-[auto_1fr]">
      <ObserverHeader session={session.data} />
      <Outlet />
    </div>
  );
}
