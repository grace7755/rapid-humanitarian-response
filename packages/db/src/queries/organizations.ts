import { asc, eq } from "drizzle-orm";

import { db } from "../index";
import { organizations } from "../schema";

const organizationSelection = {
  id: organizations.id,
  name: organizations.name,
  website: organizations.website,
  contactEmail: organizations.contactEmail,
  country: organizations.country,
  areasServed: organizations.areasServed,
  sectors: organizations.sectors,
  organizationType: organizations.organizationType,
  reviewStatus: organizations.reviewStatus,
  reviewSources: organizations.reviewSources,
  lastReviewedAt: organizations.lastReviewedAt,
  isDemo: organizations.isDemo,
  updatedAt: organizations.updatedAt,
};

export async function listOrganizations() {
  return db
    .select(organizationSelection)
    .from(organizations)
    .orderBy(asc(organizations.name));
}

export async function listReviewedOrganizationCandidates() {
  return db
    .select(organizationSelection)
    .from(organizations)
    .where(eq(organizations.reviewStatus, "reviewed"))
    .orderBy(asc(organizations.name));
}
