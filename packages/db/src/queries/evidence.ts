import { asc, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import { evidence } from "../schema/index.js";

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
  relationship: "contradicts" | "supports";
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
        ${input.relationship},
        ${input.sourceCategory},
        ${input.sourceName},
        ${input.url}
      )
      on conflict (incident_id, observation_id) do nothing
      returning id, incident_id
    ), invalidated as (
      update incidents as incident
      set
        state = case when incident.state in ('corroborated', 'escalation_ready', 'notified') then 'verifying' else incident.state end,
        updated_at = now(),
        verification_status = 'pending'
      from inserted
      where incident.id = inserted.incident_id
      returning incident.id
    )
    select id as evidence_id from inserted
  `);
  const [created] = result.rows;
  return created ? { id: created.evidence_id } : null;
}
