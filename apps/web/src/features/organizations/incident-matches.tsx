import { Button } from "@my-better-t-app/ui/components/button";
import { useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import { orpc } from "@/utils/orpc";

import OrganizationMatchCard from "./organization-match-card";

export default function IncidentMatches({
  incidentId,
}: {
  incidentId: string;
}) {
  const matchesQuery = useQuery(
    orpc.observer.match.list.queryOptions({ input: { incidentId } }),
  );

  return (
    <div className="space-y-5">
      <p className="max-w-2xl text-muted-foreground text-sm leading-6">
        The autonomous matching agent uses service area, reported needs, partner
        consent, and the reviewed registry. Matching starts only after strict
        verification consensus succeeds.
      </p>
      {matchesQuery.isLoading ? (
        <LoadingState label="Loading autonomous organization matches" />
      ) : null}
      {matchesQuery.isError ? (
        <div className="space-y-3">
          <EmptyState
            description="Stored matches could not be loaded."
            title="Matches unavailable"
          />
          <Button
            className="min-h-11"
            onClick={() => matchesQuery.refetch()}
            variant="outline"
          >
            Retry matches
          </Button>
        </div>
      ) : null}
      {matchesQuery.data?.length === 0 ? (
        <EmptyState
          description="No partner has been matched yet. The evidence threshold is not weakened when no eligible partner is available."
          title="No autonomous matches"
        />
      ) : null}
      {matchesQuery.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matchesQuery.data.map((match) => (
            <OrganizationMatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
