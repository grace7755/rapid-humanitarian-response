import { desc, eq } from "drizzle-orm";

import { db } from "../index.js";
import {
  incidentMatches,
  type NewIncidentMatch,
  organizations,
} from "../schema/index.js";

export type ReplacementMatch = Pick<
  NewIncidentMatch,
  "organizationId" | "reasons" | "score"
>;

export async function replaceIncidentMatches(
  incidentId: string,
  matches: ReplacementMatch[],
) {
  const deleteExisting = db
    .delete(incidentMatches)
    .where(eq(incidentMatches.incidentId, incidentId));

  if (matches.length === 0) {
    await deleteExisting;
    return [];
  }

  const insertNew = db
    .insert(incidentMatches)
    .values(matches.map((match) => ({ ...match, incidentId })))
    .returning({
      id: incidentMatches.id,
      organizationId: incidentMatches.organizationId,
      score: incidentMatches.score,
    });

  const [, inserted] = await db.batch([deleteExisting, insertNew]);
  return inserted;
}

export async function listIncidentMatches(incidentId: string) {
  return db
    .select({
      id: incidentMatches.id,
      score: incidentMatches.score,
      reasons: incidentMatches.reasons,
      createdAt: incidentMatches.createdAt,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationWebsite: organizations.website,
      contactEmail: organizations.contactEmail,
      isDemo: organizations.isDemo,
      reviewStatus: organizations.reviewStatus,
    })
    .from(incidentMatches)
    .innerJoin(
      organizations,
      eq(incidentMatches.organizationId, organizations.id),
    )
    .where(eq(incidentMatches.incidentId, incidentId))
    .orderBy(desc(incidentMatches.score));
}
