import { Button } from "@my-better-t-app/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";

import PageHeader from "@/components/page-header";
import PrototypeBanner from "@/components/prototype-banner";

export const Route = createFileRoute("/report_/success/$reference")({
  component: ReportSuccessRoute,
});

function ReportSuccessRoute() {
  const { reference } = Route.useParams();

  return (
    <div className="overflow-y-auto">
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm sm:p-8">
          <PageHeader
            description="The report was stored for operator review. This confirmation does not mean the report was verified or that an organization was contacted."
            eyebrow="Report received"
            title="Thank you for reporting carefully"
          />
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">Reference</p>
            <p className="mt-1 break-all font-mono text-lg font-semibold">
              {reference}
            </p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Keep this reference for your records. This prototype does not
            provide public incident tracking or expose report details.
          </p>
          <Button className="min-h-11" render={<Link to="/" />}>
            Return home
          </Button>
        </div>
      </main>
    </div>
  );
}
