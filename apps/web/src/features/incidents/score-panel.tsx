import { Button } from "@my-better-t-app/ui/components/button";
import { useQuery } from "@tanstack/react-query";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import ScoreBadge from "@/components/score-badge";
import { orpc } from "@/utils/orpc";

export default function ScorePanel({ incidentId }: { incidentId: string }) {
  const scoreQuery = useQuery(
    orpc.observer.score.get.queryOptions({ input: { incidentId } }),
  );
  if (scoreQuery.isLoading)
    return <LoadingState label="Loading autonomous scores" />;
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
    </div>
  );
}
