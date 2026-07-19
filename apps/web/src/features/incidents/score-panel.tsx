import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import ScoreBadge from "@/components/score-badge";
import { orpc } from "@/utils/orpc";

export default function ScorePanel({ incidentId }: { incidentId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const scoreQuery = useQuery(
    orpc.operator.score.get.queryOptions({ input: { incidentId } }),
  );
  const recalculate = useMutation(
    orpc.operator.score.recalculate.mutationOptions(),
  );

  if (scoreQuery.isLoading) return <LoadingState label="Calculating scores" />;
  if (scoreQuery.isError || !scoreQuery.data) {
    return (
      <div className="space-y-3">
        <EmptyState
          description="The score explanation could not be loaded."
          title="Scores unavailable"
        />
        <Button
          className="min-h-11"
          onClick={() => scoreQuery.refetch()}
          variant="outline"
        >
          Retry scores
        </Button>
      </div>
    );
  }

  const score = scoreQuery.data;
  const runRecalculation = async () => {
    setError(null);
    try {
      await recalculate.mutateAsync({ incidentId });
      await queryClient.invalidateQueries();
    } catch {
      setError("Scores could not be recalculated. Reload and retry.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <ScoreBadge
          label={`Confidence — ${score.confidence.label}`}
          score={score.confidence.score}
        />
        <ScoreBadge
          label={`Urgency — ${score.urgency.label}`}
          score={score.urgency.score}
        />
      </div>

      {score.isStale ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm leading-6">
          Stored scores are {score.storedConfidenceScore} confidence and{" "}
          {score.storedUrgencyScore} urgency. Current facts or evidence produce
          different values. Recalculate explicitly before approval.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Stored scores match the current facts and evidence.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ScoreBreakdown
          entries={score.confidence.breakdown}
          title="Confidence breakdown"
        />
        <ScoreBreakdown
          entries={score.urgency.breakdown}
          title="Urgency breakdown"
        />
      </div>

      <Button
        className="min-h-11"
        disabled={recalculate.isPending}
        onClick={runRecalculation}
      >
        {recalculate.isPending
          ? "Recalculating scores…"
          : "Recalculate confidence and urgency"}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {recalculate.isPending ? "Persisting deterministic scores." : ""}
      </p>
    </div>
  );
}

function ScoreBreakdown({
  entries,
  title,
}: {
  entries: Array<{ key: string; label: string; points: number }>;
  title: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold">{title}</h3>
      {entries.length ? (
        <ul className="mt-3 space-y-2 text-sm">
          {entries.map((entry) => (
            <li className="flex justify-between gap-4" key={entry.key}>
              <span>{entry.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {entry.points > 0 ? "+" : ""}
                {entry.points}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-muted-foreground text-sm">
          No reported urgency conditions add points.
        </p>
      )}
    </div>
  );
}
