import { and, asc, eq } from "drizzle-orm";

import { db } from "../index.js";
import { evidence, type NewEvidence } from "../schema/index.js";

export function derivePublisherDomain(url: string) {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Evidence URL must use HTTP or HTTPS.");
  }

  return parsedUrl.hostname.toLowerCase();
}

export type AddEvidenceInput = Omit<
  NewEvidence,
  "createdAt" | "id" | "publisherDomain"
>;

export async function addEvidence(input: AddEvidenceInput) {
  const [created] = await db
    .insert(evidence)
    .values({
      ...input,
      publisherDomain: derivePublisherDomain(input.url),
    })
    .returning({
      id: evidence.id,
      incidentId: evidence.incidentId,
      publisherDomain: evidence.publisherDomain,
    });

  return created;
}

export async function removeEvidence(evidenceId: string, incidentId: string) {
  const [removed] = await db
    .delete(evidence)
    .where(
      and(eq(evidence.id, evidenceId), eq(evidence.incidentId, incidentId)),
    )
    .returning({ id: evidence.id, incidentId: evidence.incidentId });

  return removed ?? null;
}

export async function listEvidenceForIncident(incidentId: string) {
  return db
    .select({
      id: evidence.id,
      url: evidence.url,
      sourceName: evidence.sourceName,
      publisherDomain: evidence.publisherDomain,
      sourceCategory: evidence.sourceCategory,
      relationship: evidence.relationship,
      isIndependent: evidence.isIndependent,
      note: evidence.note,
      publishedAt: evidence.publishedAt,
      createdByUserId: evidence.createdByUserId,
      createdAt: evidence.createdAt,
    })
    .from(evidence)
    .where(eq(evidence.incidentId, incidentId))
    .orderBy(asc(evidence.createdAt));
}
