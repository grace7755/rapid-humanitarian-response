import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import { orpc } from "@/utils/orpc";

import OrganizationMatchCard from "./organization-match-card";

export default function IncidentMatches({
  canGenerate,
  incidentId,
}: {
  canGenerate: boolean;
  incidentId: string;
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const matchesQuery = useQuery(
    orpc.operator.match.list.queryOptions({ input: { incidentId } }),
  );
  const generate = useMutation(orpc.operator.match.generate.mutationOptions());

  const generateMatches = async () => {
    setError(null);
    try {
      await generate.mutateAsync({ incidentId });
      await queryClient.invalidateQueries();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Matches could not be generated. Recheck the approval gate.",
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-muted-foreground text-sm leading-6">
          Matching is deterministic and uses reviewed registry records, relevant
          sectors, service areas, and public contact presence. It never claims
          availability.
        </p>
        <Button
          className="min-h-11 shrink-0"
          disabled={!canGenerate || generate.isPending}
          onClick={generateMatches}
        >
          {generate.isPending ? "Generating matches…" : "Generate top matches"}
        </Button>
      </div>

      {!canGenerate ? (
        <p className="rounded-md border p-3 text-sm">
          Approve facts through the evidence gate before generating matches.
        </p>
      ) : null}

      {matchesQuery.isLoading ? (
        <LoadingState label="Loading protected organization matches" />
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
          description="No reviewed organization match has been generated. If generation returns no results, the review rules are not weakened."
          title="No reviewed matches"
        />
      ) : null}
      {matchesQuery.data?.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matchesQuery.data.map((match) => (
            <OrganizationMatchCard key={match.id} match={match} />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {generate.isPending
          ? "Revalidating approved facts and current evidence."
          : ""}
      </p>
    </div>
  );
}
