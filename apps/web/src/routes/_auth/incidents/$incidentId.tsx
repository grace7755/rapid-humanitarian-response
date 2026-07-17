import { createFileRoute } from "@tanstack/react-router";

import IncidentDetail from "@/features/incidents/incident-detail";

export const Route = createFileRoute("/_auth/incidents/$incidentId")({
  component: IncidentRoute,
});

function IncidentRoute() {
  const { incidentId } = Route.useParams();
  return <IncidentDetail incidentId={incidentId} />;
}
