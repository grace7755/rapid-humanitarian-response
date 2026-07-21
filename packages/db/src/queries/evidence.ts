import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import {
  auditEvents,
  evidence,
  incidents,
  type NewEvidence,
} from "../schema/index.js";

function invalidateApproval(incidentId: string) {
  return db
    .update(incidents)
    .set({
      factsApproved: false,
      state: sql`case when ${incidents.factsApproved} and ${incidents.state} in ('corroborated', 'outreach_ready', 'contact_attempted') then 'reviewing' else ${incidents.state} end`,
      updatedAt: new Date(),
      verificationStatus: "agent_review",
    })
    .where(eq(incidents.id, incidentId));
}

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

  const [createdRows] = await db.batch([
    insertEvidence,
    invalidateApproval(input.incidentId),
    insertAudit,
  ]);
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

  const [removedRows] = await db.batch([
    deleteEvidence,
    invalidateApproval(incidentId),
    insertAudit,
  ]);
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
      createdByAgentRunId: evidence.createdByAgentRunId,
      createdAt: evidence.createdAt,
    })
    .from(evidence)
    .where(eq(evidence.incidentId, incidentId))
    .orderBy(asc(evidence.createdAt));
}

export async function addAgentEvidence(input: {
  agentRunId: string;
  incidentId: string;
  isIndependent: boolean;
  observationId: string;
  publisherDomain: string;
  sourceCategory: string;
  sourceName: string;
  url: string;
}) {
  const result = await db.execute(sql<{ evidence_id: string }>`
    with inserted as (
      insert into evidence (
        created_by_agent_run_id,
        incident_id,
        is_independent,
        observation_id,
        publisher_domain,
        relationship,
        source_category,
        source_name,
        url
      ) values (
        ${input.agentRunId}::uuid,
        ${input.incidentId}::uuid,
        ${input.isIndependent},
        ${input.observationId}::uuid,
        ${input.publisherDomain},
        'supports',
        ${input.sourceCategory},
        ${input.sourceName},
        ${input.url}
      )
      on conflict (incident_id, observation_id) do nothing
      returning id, incident_id
    ), invalidated as (
      update incidents as incident
      set
        facts_approved = false,
        state = case when incident.facts_approved and incident.state in ('corroborated', 'outreach_ready', 'contact_attempted') then 'reviewing' else incident.state end,
        updated_at = now(),
        verification_status = 'agent_review'
      from inserted
      where incident.id = inserted.incident_id
      returning incident.id
    )
    select id as evidence_id from inserted
  `);
  const [created] = result.rows;
  return created ? { id: created.evidence_id } : null;
}
