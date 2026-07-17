import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome {session.data?.user.name}</p>
      <p>The operator incident workspace is being prepared.</p>
    </div>
  );
}
