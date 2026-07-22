import { Button } from "@my-better-t-app/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import LoadingState from "@/components/loading-state";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const incidents = useQuery(
    orpc.observer.incident.list.queryOptions({ input: {} }),
  );
  const runs = useQuery(
    orpc.observer.monitoring.listAgentRuns.queryOptions({
      input: { limit: 20 },
    }),
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        description="Read-only visibility into autonomous classification, verification, matching, and partner delivery."
        eyebrow="Autonomous operations"
        title="Incident observability"
      />
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-xl">Recent incidents</h2>
        {incidents.isLoading ? (
          <LoadingState label="Loading incidents" />
        ) : null}
        <div className="mt-4 space-y-3">
          {incidents.data?.map((incident) => (
            <article
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
              key={incident.id}
            >
              <div>
                <h3 className="font-semibold">
                  {incident.title || incident.reference}
                </h3>
                <p className="mt-1 text-muted-foreground text-sm">
                  {incident.district || "Location unresolved"} · confidence{" "}
                  {incident.confidenceScore}/100
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge className="capitalize" status={incident.state} />
                <Button
                  render={
                    <Link
                      params={{ incidentId: incident.id }}
                      to="/incidents/$incidentId"
                    />
                  }
                  variant="outline"
                >
                  View
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="font-semibold text-xl">Recent agent runs</h2>
        {runs.isLoading ? <LoadingState label="Loading agent runs" /> : null}
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {runs.data?.map((run) => (
            <li className="rounded-lg border p-4" key={run.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium capitalize">
                  {run.agentName.replaceAll("_", " ")}
                </span>
                <StatusBadge className="capitalize" status={run.status} />
              </div>
              {run.errorCode ? (
                <p className="mt-2 text-destructive text-sm">{run.errorCode}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
