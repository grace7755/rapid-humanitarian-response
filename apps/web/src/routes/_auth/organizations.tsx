import { createFileRoute } from "@tanstack/react-router";

import PageHeader from "@/components/page-header";
import PrototypeBanner from "@/components/prototype-banner";
import OrganizationList from "@/features/organizations/organization-list";

export const Route = createFileRoute("/_auth/organizations")({
  component: OrganizationsRoute,
});

function OrganizationsRoute() {
  return (
    <div className="overflow-y-auto">
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          description="Read-only records used for deterministic matching. A listing does not mean an organization is available."
          eyebrow="Protected observer registry"
          title="Reviewed organizations"
        />
        <OrganizationList />
      </main>
    </div>
  );
}
