import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "../index.js";
import {
  auditEvents,
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
  actorUserId: string | null = null,
) {
  const deleteExisting = db
    .delete(incidentMatches)
    .where(eq(incidentMatches.incidentId, incidentId));

  if (matches.length === 0) {
    const insertAudit = db.insert(auditEvents).values({
      actorUserId,
      eventType: "matches.generated",
      incidentId,
      metadata: { matchCount: 0, matchScores: [] },
    });
    await db.batch([deleteExisting, insertAudit]);
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
  const insertAudit = db.insert(auditEvents).values({
    actorUserId,
    eventType: "matches.generated",
    incidentId,
    metadata: {
      matchCount: matches.length,
      matchScores: matches.map((match) => match.score),
    },
  });

  const [, inserted] = await db.batch([deleteExisting, insertNew, insertAudit]);
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
    .where(
      and(
        eq(incidentMatches.incidentId, incidentId),
        eq(organizations.reviewStatus, "reviewed"),
      ),
    )
    .orderBy(
      desc(incidentMatches.score),
      asc(organizations.name),
      asc(organizations.id),
    )
    .limit(3);
}
