import { and, asc, eq } from "drizzle-orm";

import { db } from "../index.js";
import { auditEvents, evidence, type NewEvidence } from "../schema/index.js";

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
  const evidenceId = crypto.randomUUID();
  const publisherDomain = derivePublisherDomain(input.url);
  const insertEvidence = db
    .insert(evidence)
    .values({
      ...input,
      id: evidenceId,
      publisherDomain,
    })
    .returning({
      id: evidence.id,
      incidentId: evidence.incidentId,
      publisherDomain: evidence.publisherDomain,
    });
  const insertAudit = db.insert(auditEvents).values({
    actorUserId: input.createdByUserId,
    eventType: "evidence.added",
    incidentId: input.incidentId,
    metadata: {
      evidenceId,
      relationship: input.relationship,
      sourceCategory: input.sourceCategory,
    },
  });

  const [createdRows] = await db.batch([insertEvidence, insertAudit]);
  return createdRows[0];
}

export async function removeEvidence(
  evidenceId: string,
  incidentId: string,
  actorUserId: string,
) {
  const [existing] = await db
    .select({
      id: evidence.id,
      incidentId: evidence.incidentId,
      relationship: evidence.relationship,
      sourceCategory: evidence.sourceCategory,
    })
    .from(evidence)
    .where(
      and(eq(evidence.id, evidenceId), eq(evidence.incidentId, incidentId)),
    )
    .limit(1);
  if (!existing) return null;

  const deleteEvidence = db
    .delete(evidence)
    .where(
      and(eq(evidence.id, evidenceId), eq(evidence.incidentId, incidentId)),
    )
    .returning({
      id: evidence.id,
      incidentId: evidence.incidentId,
      relationship: evidence.relationship,
      sourceCategory: evidence.sourceCategory,
    });
  const insertAudit = db.insert(auditEvents).values({
    actorUserId,
    eventType: "evidence.removed",
    incidentId,
    metadata: {
      evidenceId: existing.id,
      relationship: existing.relationship,
      sourceCategory: existing.sourceCategory,
    },
  });

  const [removedRows] = await db.batch([deleteEvidence, insertAudit]);
  const [removed] = removedRows;
  return removed ? { id: removed.id, incidentId: removed.incidentId } : null;
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
