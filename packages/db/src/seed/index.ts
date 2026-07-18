import { db } from "../index.js";
import { organizations } from "../schema/index.js";
import { DEMO_ORGANIZATIONS } from "./organizations.js";

export async function seedDemoOrganizations() {
  for (const organization of DEMO_ORGANIZATIONS) {
    await db
      .insert(organizations)
      .values(organization)
      .onConflictDoUpdate({
        target: organizations.id,
        set: {
          areasServed: organization.areasServed,
          contactEmail: organization.contactEmail,
          country: organization.country,
          isDemo: organization.isDemo,
          lastReviewedAt: organization.lastReviewedAt,
          name: organization.name,
          organizationType: organization.organizationType,
          reviewSources: organization.reviewSources,
          reviewStatus: organization.reviewStatus,
          sectors: organization.sectors,
          updatedAt: new Date(),
          website: organization.website,
        },
      });
  }

  return { seeded: DEMO_ORGANIZATIONS.length };
}

if (import.meta.main) {
  const result = await seedDemoOrganizations();
  process.stdout.write(
    `Seeded ${result.seeded} demo organization record(s).\n`,
  );
}
