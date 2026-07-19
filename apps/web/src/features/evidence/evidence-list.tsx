import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import EmptyState from "@/components/empty-state";
import LoadingState from "@/components/loading-state";
import StatusBadge from "@/components/status-badge";
import { orpc } from "@/utils/orpc";

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function relationshipLabel(relationship: string) {
  if (relationship === "context") return "Context Only";
  return relationship === "supports" ? "Supports" : "Contradicts";
}

export default function EvidenceList({ incidentId }: { incidentId: string }) {
  const queryClient = useQueryClient();
  const [removeError, setRemoveError] = useState<string | null>(null);
  const evidenceQuery = useQuery(
    orpc.operator.evidence.list.queryOptions({ input: { incidentId } }),
  );
  const removeEvidence = useMutation(
    orpc.operator.evidence.remove.mutationOptions(),
  );

  if (evidenceQuery.isLoading) {
    return <LoadingState label="Loading protected evidence" />;
  }
  if (evidenceQuery.isError) {
    return (
      <div className="space-y-3">
        <EmptyState
          description="The protected evidence list could not be loaded."
          title="Evidence unavailable"
        />
        <Button
          className="min-h-11"
          onClick={() => evidenceQuery.refetch()}
          variant="outline"
        >
          Retry evidence
        </Button>
      </div>
    );
  }
  if (!evidenceQuery.data?.length) {
    return (
      <EmptyState
        description="Add at least one public supporting source before facts can be approved."
        title="No evidence listed"
      />
    );
  }

  const remove = async (evidenceId: string) => {
    if (
      !window.confirm(
        "Remove this evidence record? Stored scores will remain unchanged until explicit recalculation.",
      )
    ) {
      return;
    }
    setRemoveError(null);
    try {
      await removeEvidence.mutateAsync({ evidenceId, incidentId });
      await queryClient.invalidateQueries();
    } catch {
      setRemoveError("Evidence could not be removed. Reload and retry.");
    }
  };

  return (
    <div className="space-y-3">
      {evidenceQuery.data.map((item) => (
        <article className="rounded-lg border p-4" key={item.id}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  label={relationshipLabel(item.relationship)}
                  status={item.relationship}
                />
                <span className="text-muted-foreground text-sm">
                  {item.sourceCategory.replaceAll("_", " ")}
                </span>
              </div>
              <h3 className="mt-3 font-semibold">{item.sourceName}</h3>
              <a
                className="mt-1 inline-flex min-h-11 max-w-full items-center break-all text-primary underline underline-offset-4"
                href={item.url}
                rel="noreferrer"
                target="_blank"
              >
                {item.publisherDomain}
              </a>
            </div>
            <Button
              className="min-h-11 shrink-0"
              disabled={removeEvidence.isPending}
              onClick={() => remove(item.id)}
              variant="outline"
            >
              Remove
            </Button>
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium">Independent source</dt>
              <dd className="text-muted-foreground">
                {item.isIndependent
                  ? "Yes — operator confirmed"
                  : "No / not confirmed"}
              </dd>
            </div>
            <div>
              <dt className="font-medium">Published</dt>
              <dd className="text-muted-foreground">
                {item.publishedAt
                  ? dateTimeFormatter.format(new Date(item.publishedAt))
                  : "Unknown"}
              </dd>
            </div>
          </dl>
          {item.note ? (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {item.note}
            </p>
          ) : null}
        </article>
      ))}
      {removeError ? (
        <p className="text-destructive text-sm" role="alert">
          {removeError}
        </p>
      ) : null}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {removeEvidence.isPending ? "Removing evidence." : ""}
      </p>
    </div>
  );
}
