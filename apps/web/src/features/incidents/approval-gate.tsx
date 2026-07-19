import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import LoadingState from "@/components/loading-state";
import { orpc } from "@/utils/orpc";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type IncidentDetail = Awaited<
  ReturnType<AppRouterClient["operator"]["incident"]["get"]>
>;

export default function ApprovalGate({
  incident,
}: {
  incident: IncidentDetail;
}) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scoreQuery = useQuery(
    orpc.operator.score.get.queryOptions({
      input: { incidentId: incident.id },
    }),
  );
  const approve = useMutation(
    orpc.operator.incident.approveFacts.mutationOptions(),
  );

  if (scoreQuery.isLoading) {
    return <LoadingState label="Checking approval gates" />;
  }
  if (scoreQuery.isError || !scoreQuery.data) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Approval conditions could not be loaded. Retry the score section.
      </p>
    );
  }

  const conditions = scoreQuery.data.approvalConditions;
  const serverConditionsPass = conditions.every(
    (condition) => condition.passed,
  );
  const approveFacts = async () => {
    setError(null);
    try {
      await approve.mutateAsync({
        confirmation: true,
        incidentId: incident.id,
      });
      await queryClient.invalidateQueries();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Facts could not be approved. Reload and recheck every condition.",
      );
    }
  };

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {conditions.map((condition) => (
          <li className="flex items-start gap-3 text-sm" key={condition.key}>
            <span aria-hidden="true" className="mt-0.5">
              {condition.passed ? "✓" : "×"}
            </span>
            <span>
              <span className="font-medium">
                {condition.passed ? "Passed" : "Blocked"}:
              </span>{" "}
              {condition.label}
            </span>
          </li>
        ))}
      </ul>

      {incident.factsApproved ? (
        <p className="rounded-md border p-3 text-sm">
          Facts approved
          {incident.reviewedAt
            ? ` on ${dateTimeFormatter.format(new Date(incident.reviewedAt))}`
            : ""}
          . Matching still revalidates current evidence on the server.
        </p>
      ) : (
        <>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3">
            <input
              checked={confirmed}
              className="mt-0.5 size-5 shrink-0"
              onChange={(event) => setConfirmed(event.target.checked)}
              type="checkbox"
            />
            <span>I reviewed these facts against the listed evidence</span>
          </label>
          <Button
            className="min-h-11"
            disabled={
              !confirmed ||
              !serverConditionsPass ||
              scoreQuery.data.isStale ||
              incident.state !== "reviewing" ||
              approve.isPending
            }
            onClick={approveFacts}
          >
            {approve.isPending ? "Approving facts…" : "Approve reviewed facts"}
          </Button>
        </>
      )}

      {scoreQuery.data.isStale ? (
        <p className="text-muted-foreground text-sm">
          Recalculate scores before approval.
        </p>
      ) : null}
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {approve.isPending
          ? "Revalidating current evidence on the server."
          : ""}
      </p>
    </div>
  );
}
