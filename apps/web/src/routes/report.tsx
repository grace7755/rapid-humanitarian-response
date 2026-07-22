import { createFileRoute } from "@tanstack/react-router";

import PageHeader from "@/components/page-header";
import PrototypeBanner from "@/components/prototype-banner";
import IncidentForm from "@/features/reports/incident-form";

export const Route = createFileRoute("/report")({
  component: ReportRoute,
});

function ReportRoute() {
  return (
    <div className="overflow-y-auto">
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <PageHeader
          description="Share a concise, non-identifying report for autonomous cross-checking. Country is fixed to Bangladesh and the pilot covers Chattogram Division."
          eyebrow="Anonymous report"
          title="Submit an incident report"
        />
        <IncidentForm />
      </main>
    </div>
  );
}
