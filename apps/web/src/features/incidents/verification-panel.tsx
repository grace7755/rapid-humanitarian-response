import { useQuery } from "@tanstack/react-query";

import LoadingState from "@/components/loading-state";
import StatusBadge from "@/components/status-badge";
import { orpc } from "@/utils/orpc";

export default function VerificationPanel({
  incidentId,
  revision,
}: {
  incidentId: string;
  revision: number;
}) {
  const query = useQuery(
    orpc.observer.verification.list.queryOptions({
      input: { incidentId, revision },
    }),
  );
  if (query.isLoading)
    return <LoadingState label="Loading verifier verdicts" />;
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Verifier verdicts could not be loaded.
      </p>
    );
  }
  if (!query.data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No verifier verdict is stored yet.
      </p>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {query.data.map((verdict) => (
        <article className="rounded-lg border p-4" key={verdict.id}>
          <StatusBadge className="capitalize" status={verdict.verdict} />
          <h3 className="mt-3 font-semibold capitalize">
            {verdict.verifierRole.replaceAll("_", " ")}
          </h3>
          <p className="mt-2 text-muted-foreground text-sm">
            Confidence {verdict.confidenceScore}/100
          </p>
          <p className="mt-2 break-words text-muted-foreground text-xs leading-5">
            {verdict.sourceDomains.join(", ") ||
              "No qualifying independent domain"}
          </p>
        </article>
      ))}
    </div>
  );
}
