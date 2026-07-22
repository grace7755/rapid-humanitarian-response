import { useQuery } from "@tanstack/react-query";

import LoadingState from "@/components/loading-state";
import StatusBadge from "@/components/status-badge";
import { orpc } from "@/utils/orpc";

export default function NotificationPanel({
  incidentId,
}: {
  incidentId: string;
}) {
  const query = useQuery(
    orpc.observer.notification.list.queryOptions({ input: { incidentId } }),
  );
  if (query.isLoading)
    return <LoadingState label="Loading partner deliveries" />;
  if (query.isError) {
    return (
      <p className="text-destructive text-sm">
        Delivery records could not be loaded.
      </p>
    );
  }
  if (!query.data?.length) {
    return (
      <p className="text-muted-foreground text-sm">
        No partner email has been queued.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {query.data.map((notification) => (
        <li
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
          key={notification.id}
        >
          <div>
            <p className="font-medium">Partner email</p>
            <p className="mt-1 text-muted-foreground text-sm">
              Revision {notification.verificationRevision} · recipient protected
            </p>
          </div>
          <StatusBadge className="capitalize" status={notification.status} />
        </li>
      ))}
    </ul>
  );
}
