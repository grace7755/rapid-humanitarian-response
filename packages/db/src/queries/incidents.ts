import { and, desc, eq, sql } from "drizzle-orm";

import { db, neonSql } from "../index.js";
import { auditEvents, incidents, type NewIncident } from "../schema/index.js";

export type CreateRawIncidentInput = {
  rawReport: string;
  reference?: string;
  sourceType?: "community" | "manual";
  sourceUrl?: string | null;
};

export type PublicIncidentReceipt = {
  reference: string;
  status: "received";
};

function generateIncidentReference() {
  const randomPart = crypto.randomUUID().replaceAll("-", "").toUpperCase();
  return `RHR-${randomPart}`;
}

export async function createRawIncident(
  input: CreateRawIncidentInput,
): Promise<PublicIncidentReceipt> {
  const incidentId = crypto.randomUUID();
  const auditEventId = crypto.randomUUID();
  const reference = input.reference ?? generateIncidentReference();
  const sourceType = input.sourceType ?? "community";

  const insertIncident = neonSql`
    insert into incidents (
      id,
      reference,
      source_type,
      source_url,
      raw_report
    ) values (
      ${incidentId},
      ${reference},
      ${sourceType},
      ${input.sourceUrl ?? null},
      ${input.rawReport}
    )
  `;
  const insertAuditEvent = neonSql`
    insert into audit_events (
      id,
      incident_id,
      actor_user_id,
      event_type,
      metadata
    ) values (
      ${auditEventId},
      ${incidentId},
      null,
      'report.created',
      '{}'::jsonb
    )
  `;

  await neonSql.transaction([insertIncident, insertAuditEvent]);

  return {
    reference,
    status: "received",
  };
}

export type IncidentListFilters = {
  state?: string;
};

export async function listIncidents(filters: IncidentListFilters = {}) {
  return db
    .select({
      id: incidents.id,
      reference: incidents.reference,
      title: incidents.title,
      incidentType: incidents.incidentType,
      district: incidents.district,
      confidenceScore: incidents.confidenceScore,
      urgencyScore: incidents.urgencyScore,
      state: incidents.state,
      extractionStatus: incidents.extractionStatus,
      createdAt: incidents.createdAt,
      updatedAt: incidents.updatedAt,
    })
    .from(incidents)
    .where(filters.state ? eq(incidents.state, filters.state) : undefined)
    .orderBy(desc(incidents.urgencyScore), desc(incidents.updatedAt))
    .limit(100);
}

export async function getIncidentForOperator(incidentId: string) {
  const [incident] = await db
    .select({
      id: incidents.id,
      reference: incidents.reference,
      sourceType: incidents.sourceType,
      sourceUrl: incidents.sourceUrl,
      rawReport: incidents.rawReport,
      title: incidents.title,
      summary: incidents.summary,
      incidentType: incidents.incidentType,
      country: incidents.country,
      division: incidents.division,
      district: incidents.district,
      locationText: incidents.locationText,
      occurredAt: incidents.occurredAt,
      occurredAtPrecision: incidents.occurredAtPrecision,
      affectedEstimate: incidents.affectedEstimate,
      needs: incidents.needs,
      riskFlags: incidents.riskFlags,
      unknowns: incidents.unknowns,
      confidenceScore: incidents.confidenceScore,
      urgencyScore: incidents.urgencyScore,
      state: incidents.state,
      factsApproved: incidents.factsApproved,
      reviewedByUserId: incidents.reviewedByUserId,
      reviewedAt: incidents.reviewedAt,
      modelId: incidents.modelId,
      extractionStatus: incidents.extractionStatus,
      createdAt: incidents.createdAt,
      updatedAt: incidents.updatedAt,
    })
    .from(incidents)
    .where(eq(incidents.id, incidentId))
    .limit(1);

  return incident ?? null;
}

export type IncidentReviewUpdate = Partial<
  Pick<
    NewIncident,
    | "affectedEstimate"
    | "district"
    | "incidentType"
    | "locationText"
    | "needs"
    | "occurredAt"
    | "occurredAtPrecision"
    | "riskFlags"
    | "summary"
    | "title"
    | "unknowns"
  >
>;

export async function updateIncidentReview(
  incidentId: string,
  values: IncidentReviewUpdate,
  reviewerUserId: string,
  changedFields: string,
) {
  const now = new Date();
  const updateIncident = db
    .update(incidents)
    .set({
      ...values,
      reviewedByUserId: reviewerUserId,
      reviewedAt: now,
      updatedAt: now,
    })
    .where(eq(incidents.id, incidentId))
    .returning({ id: incidents.id, updatedAt: incidents.updatedAt });

  const insertAuditEvent = db
    .insert(auditEvents)
    .select(
      sql`
        select
          gen_random_uuid(),
          ${incidentId}::uuid,
          ${reviewerUserId},
          'incident.edited',
          ${JSON.stringify({ changedFields })}::jsonb,
          now()
        from incidents
        where id = ${incidentId}::uuid
          and updated_at = ${now}
          and reviewed_by_user_id = ${reviewerUserId}
      `,
    )
    .returning({ id: auditEvents.id });

  const [updatedRows] = await db.batch([updateIncident, insertAuditEvent]);
  const [updated] = updatedRows;
  return updated ?? null;
}

export async function updateIncidentState(
  incidentId: string,
  fromState: string,
  toState: string,
  actorUserId: string,
) {
  const now = new Date();
  const updateIncident = db
    .update(incidents)
    .set({ state: toState, updatedAt: now })
    .where(and(eq(incidents.id, incidentId), eq(incidents.state, fromState)))
    .returning({ id: incidents.id, state: incidents.state });

  const insertAuditEvent = db
    .insert(auditEvents)
    .select(
      sql`
        select
          gen_random_uuid(),
          ${incidentId}::uuid,
          ${actorUserId},
          'incident.state_changed',
          ${JSON.stringify({ newState: toState, oldState: fromState })}::jsonb,
          now()
        from incidents
        where id = ${incidentId}::uuid
          and state = ${toState}
          and updated_at = ${now}
      `,
    )
    .returning({ id: auditEvents.id });

  const [updatedRows] = await db.batch([updateIncident, insertAuditEvent]);
  const [updated] = updatedRows;
  return updated ?? null;
}

export async function startIncidentReview(
  incidentId: string,
  reviewerUserId: string,
) {
  const now = new Date();
  const updateIncident = db
    .update(incidents)
    .set({
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
      state: "reviewing",
      updatedAt: now,
    })
    .where(and(eq(incidents.id, incidentId), eq(incidents.state, "submitted")))
    .returning({ id: incidents.id, state: incidents.state });

  const insertAuditEvents = db
    .insert(auditEvents)
    .select(
      sql`
        select
          gen_random_uuid(),
          ${incidentId}::uuid,
          ${reviewerUserId},
          event.event_type,
          event.metadata,
          now()
        from incidents
        cross join (
          values
            ('incident.review_started', '{}'::jsonb),
            (
              'incident.state_changed',
              ${JSON.stringify({
                newState: "reviewing",
                oldState: "submitted",
              })}::jsonb
            )
        ) as event(event_type, metadata)
        where id = ${incidentId}::uuid
          and state = 'reviewing'
          and updated_at = ${now}
          and reviewed_by_user_id = ${reviewerUserId}
      `,
    )
    .returning({ id: auditEvents.id });

  const [updatedRows] = await db.batch([updateIncident, insertAuditEvents]);
  const [updated] = updatedRows;
  return updated ?? null;
}

export async function approveIncidentFacts(
  incidentId: string,
  reviewerUserId: string,
) {
  const now = new Date();
  const [updated] = await db
    .update(incidents)
    .set({
      factsApproved: true,
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
      updatedAt: now,
    })
    .where(eq(incidents.id, incidentId))
    .returning({
      factsApproved: incidents.factsApproved,
      id: incidents.id,
    });

  return updated ?? null;
}
