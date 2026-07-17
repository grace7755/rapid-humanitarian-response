import { Button } from "@my-better-t-app/ui/components/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import PageHeader from "@/components/page-header";
import PrototypeBanner from "@/components/prototype-banner";
import { orpc } from "@/utils/orpc";

import IncidentReviewForm from "./incident-review-form";
import IncidentStatus from "./incident-status";

function getRawDescription(rawReport: string) {
  try {
    const parsed: unknown = JSON.parse(rawReport);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "description" in parsed &&
      typeof parsed.description === "string"
    ) {
      return parsed.description;
    }
  } catch {
    return rawReport;
  }
  return rawReport;
}

export default function IncidentDetail({
  incidentId,
}: {
  incidentId: string;
}) {
  const incidentQuery = useQuery(
    orpc.operator.incident.get.queryOptions({
      input: { incidentId },
    }),
  );

  if (incidentQuery.isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <LoadingState label="Loading protected incident" />
      </main>
    );
  }

  if (incidentQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          description="The incident was not found, your operator access is unavailable, or the service could not load it."
          title="Incident unavailable"
        />
        <Button
          className="mt-5 min-h-11"
          render={<Link to="/dashboard" />}
          variant="outline"
        >
          Return to dashboard
        </Button>
      </main>
    );
  }

  const incident = incidentQuery.data;
  if (!incident) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          description="No protected incident data was returned."
          title="Incident not found"
        />
      </main>
    );
  }

  const location = [incident.district, incident.locationText]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="overflow-y-auto">
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          description={`${location || "Location awaiting review"} · Reference ${incident.reference}`}
          eyebrow="Protected operator workspace"
          title={incident.title || "Untitled submitted incident"}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0 space-y-6">
            <section
              aria-labelledby="raw-report-heading"
              className="rounded-xl border bg-card p-5 sm:p-6"
            >
              <h2 className="text-xl font-semibold" id="raw-report-heading">
                Original report
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Restricted source text. Treat it as unverified and render it
                only as plain text.
              </p>
              <p className="mt-4 whitespace-pre-wrap break-words rounded-lg bg-muted p-4 leading-7">
                {getRawDescription(incident.rawReport)}
              </p>
              {incident.sourceUrl ? (
                <a
                  className="mt-4 inline-flex min-h-11 items-center break-all font-medium text-primary underline underline-offset-4"
                  href={incident.sourceUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open submitted public source
                </a>
              ) : null}
            </section>

            <section
              aria-labelledby="reviewed-facts-heading"
              className="rounded-xl border bg-card p-5 sm:p-6"
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold" id="reviewed-facts-heading">
                  Reviewed facts
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  These fields are editable operator judgments. Saving does not
                  verify the report.
                </p>
              </div>
              <IncidentReviewForm
                incident={incident}
                key={incident.updatedAt}
              />
            </section>
          </div>

          <IncidentStatus incident={incident} />
        </div>
      </main>
    </div>
  );
}
