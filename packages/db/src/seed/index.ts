import { db } from "../index.js";
import {
  administrativeAreas,
  monitoringSources,
  organizations,
} from "../schema/index.js";
import { BANGLADESH_ADMINISTRATIVE_AREAS } from "./administrative-areas.js";
import { DEFAULT_MONITORING_SOURCES } from "./monitoring-sources.js";
import { DEMO_ORGANIZATIONS } from "./organizations.js";

export async function seedDemoOrganizations() {
  for (const area of BANGLADESH_ADMINISTRATIVE_AREAS) {
    await db.insert(administrativeAreas).values(area).onConflictDoNothing();
  }

  for (const source of DEFAULT_MONITORING_SOURCES) {
    await db
      .insert(monitoringSources)
      .values(source)
      .onConflictDoUpdate({
        target: monitoringSources.id,
        set: {
          connectorType: source.connectorType,
          endpoint: source.endpoint,
          name: source.name,
          trustTier: source.trustTier,
          updatedAt: new Date(),
        },
      });
  }

  for (const organization of DEMO_ORGANIZATIONS) {
    await db
      .insert(organizations)
      .values(organization)
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          areasServed: organization.areasServed,
          contactEmail: organization.contactEmail,
          phoneNumber: organization.phoneNumber,
          country: organization.country,
          isDemo: organization.isDemo,
          lastReviewedAt: organization.lastReviewedAt,
          name: organization.name,
          organizationType: organization.organizationType,
          escalationTier: organization.escalationTier,
          automationAllowed: organization.automationAllowed,
          operatingNotes: organization.operatingNotes,
          reviewSources: organization.reviewSources,
          reviewStatus: organization.reviewStatus,
          sectors: organization.sectors,
          updatedAt: new Date(),
          website: organization.website,
        },
      });
  }

  return {
    administrativeAreas: BANGLADESH_ADMINISTRATIVE_AREAS.length,
    monitoringSources: DEFAULT_MONITORING_SOURCES.length,
    organizations: DEMO_ORGANIZATIONS.length,
  };
}

if (import.meta.main) {
  const result = await seedDemoOrganizations();
  process.stdout.write(
    `Seeded ${result.administrativeAreas} administrative areas, ${result.monitoringSources} monitoring sources, and ${result.organizations} demo organization record(s).\n`,
  );
}
