import { Button } from "@my-better-t-app/ui/components/button";
import { Card, CardContent } from "@my-better-t-app/ui/components/card";
import { useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import StatusBadge from "@/components/status-badge";
import { orpc } from "@/utils/orpc";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
});

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function OrganizationList() {
  const organizationsQuery = useQuery(
    orpc.operator.organization.list.queryOptions({ input: {} }),
  );

  if (organizationsQuery.isLoading) {
    return <LoadingState label="Loading protected organization registry" />;
  }
  if (organizationsQuery.isError) {
    return (
      <div className="space-y-4">
        <EmptyState
          description="The protected organization registry could not be loaded."
          title="Registry unavailable"
        />
        <Button
          className="min-h-11"
          onClick={() => organizationsQuery.refetch()}
          variant="outline"
        >
          Retry registry
        </Button>
      </div>
    );
  }
  if (!organizationsQuery.data?.length) {
    return (
      <EmptyState
        description="No curated or demo organization records are available."
        title="Registry is empty"
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {organizationsQuery.data.map((organization) => (
        <Card key={organization.id}>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-lg">{organization.name}</h2>
                <p className="mt-1 text-muted-foreground capitalize">
                  {displayLabel(organization.organizationType)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  className="capitalize"
                  status={organization.reviewStatus}
                />
                {organization.isDemo ? (
                  <span className="rounded-full border px-3 py-1 font-semibold text-xs">
                    Demo
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="font-medium">Coverage</dt>
                <dd className="mt-1 text-muted-foreground">
                  {organization.areasServed.join(", ") || "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Sectors</dt>
                <dd className="mt-1 text-muted-foreground">
                  {organization.sectors.map(displayLabel).join(", ") ||
                    "Not listed"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Last reviewed</dt>
                <dd className="mt-1 text-muted-foreground">
                  {organization.lastReviewedAt
                    ? dateFormatter.format(
                        new Date(organization.lastReviewedAt),
                      )
                    : "Not reviewed"}
                </dd>
              </div>
              <div>
                <dt className="font-medium">Public contact</dt>
                <dd className="mt-1 break-all text-muted-foreground">
                  {organization.contactEmail || "Not listed"}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-4">
              <a
                className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                href={organization.website}
                rel="noreferrer"
                target="_blank"
              >
                Website
              </a>
              {organization.reviewSources.map((source, index) => (
                <a
                  className="inline-flex min-h-11 items-center text-primary underline underline-offset-4"
                  href={source}
                  key={source}
                  rel="noreferrer"
                  target="_blank"
                >
                  Review source {index + 1}
                </a>
              ))}
            </div>
            <p className="border-t pt-3 text-muted-foreground text-xs leading-5">
              Registry inclusion and matching do not indicate current
              availability or response capacity.
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
