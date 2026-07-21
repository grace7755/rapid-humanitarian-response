import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db, neonSql } from "../index.js";
import { communityReportContentHash } from "../report-identity.js";
import {
  auditEvents,
  incidents,
  type NewIncident,
  sourceObservations,
} from "../schema/index.js";
import { insertSourceObservationAndEnqueueCorrelation } from "./monitoring.js";

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
  const reference = input.reference ?? generateIncidentReference();
  const contentHash = await communityReportContentHash(
    reference,
    input.rawReport,
  );

  const ensureCommunitySource = neonSql`
    insert into monitoring_sources (
      id, key, name, connector_type, endpoint, trust_tier, enabled
    ) values (
      '9cc607da-a19e-4a80-bdbc-e2273291e657',
      'community-report',
      'Community emergency reports',
      'community',
      'internal://public-report',
      'community',
      false
    ) on conflict (key) do nothing
  `;

  await ensureCommunitySource;
  await insertSourceObservationAndEnqueueCorrelation({
    canonicalUrl: input.sourceUrl ?? null,
    contentHash,
    country: "Bangladesh",
    district: null,
    division: null,
    excerpt: null,
    externalId: reference,
    incidentId: null,
    incidentTypeCandidate: null,
    publishedAt: null,
    restrictedPayload: { rawReport: input.rawReport },
    sourceId: "9cc607da-a19e-4a80-bdbc-e2273291e657",
    title: null,
  });

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
      priorityLevel: incidents.priorityLevel,
      verificationStatus: incidents.verificationStatus,
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
      origin: incidents.origin,
      sourceUrl: incidents.sourceUrl,
      rawReport: incidents.rawReport,
      title: incidents.title,
      summary: incidents.summary,
      incidentType: incidents.incidentType,
      country: incidents.country,
      division: incidents.division,
      divisionCode: incidents.divisionCode,
      district: incidents.district,
      districtCode: incidents.districtCode,
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
      verificationStatus: incidents.verificationStatus,
      priorityLevel: incidents.priorityLevel,
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
      factsApproved: false,
      reviewedByUserId: reviewerUserId,
      reviewedAt: now,
      state: sql`case when ${incidents.factsApproved} and ${incidents.state} in ('corroborated', 'outreach_ready', 'contact_attempted') then 'reviewing' else ${incidents.state} end`,
      updatedAt: now,
      verificationStatus: "agent_review",
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
  scores: { confidenceScore: number; urgencyScore: number },
) {
  const now = new Date();
  const updateIncident = db
    .update(incidents)
    .set({
      confidenceScore: scores.confidenceScore,
      factsApproved: true,
      reviewedAt: now,
      reviewedByUserId: reviewerUserId,
      state: "corroborated",
      verificationStatus: "operator_approved",
      updatedAt: now,
      urgencyScore: scores.urgencyScore,
    })
    .where(
      and(
        eq(incidents.id, incidentId),
        eq(incidents.state, "reviewing"),
        eq(incidents.factsApproved, false),
      ),
    )
    .returning({
      factsApproved: incidents.factsApproved,
      id: incidents.id,
    });

  const insertAuditEvents = db.insert(auditEvents).select(
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
            (
              'scores.calculated',
              ${JSON.stringify(scores)}::jsonb
            ),
            (
              'incident.facts_approved',
              '{}'::jsonb
            ),
            (
              'incident.state_changed',
              ${JSON.stringify({
                newState: "corroborated",
                oldState: "reviewing",
              })}::jsonb
            )
        ) as event(event_type, metadata)
        where id = ${incidentId}::uuid
          and state = 'corroborated'
          and facts_approved = true
          and updated_at = ${now}
          and reviewed_by_user_id = ${reviewerUserId}
      `,
  );

  const [updatedRows] = await db.batch([updateIncident, insertAuditEvents]);
  const [updated] = updatedRows;
  return updated ?? null;
}

export async function updateIncidentScores(
  incidentId: string,
  scores: { confidenceScore: number; urgencyScore: number },
  actorUserId: string,
) {
  const now = new Date();
  const updateIncident = db
    .update(incidents)
    .set({ ...scores, updatedAt: now })
    .where(eq(incidents.id, incidentId))
    .returning({
      confidenceScore: incidents.confidenceScore,
      id: incidents.id,
      urgencyScore: incidents.urgencyScore,
    });
  const insertAudit = db.insert(auditEvents).select(
    sql`
        select
          gen_random_uuid(),
          ${incidentId}::uuid,
          ${actorUserId},
          'scores.calculated',
          ${JSON.stringify(scores)}::jsonb,
          now()
        from incidents
        where id = ${incidentId}::uuid
          and updated_at = ${now}
      `,
  );

  const [updatedRows] = await db.batch([updateIncident, insertAudit]);
  return updatedRows[0] ?? null;
}

export async function updateIncidentAgentAssessment(
  incidentId: string,
  values: {
    confidenceScore?: number;
    priorityLevel?: "P0" | "P1" | "P2" | "P3";
    urgencyScore?: number;
    verificationStatus?:
      | "agent_corroborated"
      | "agent_review"
      | "contradicted"
      | "unverified";
  },
) {
  const [updated] = await db
    .update(incidents)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(eq(incidents.id, incidentId), eq(incidents.factsApproved, false)),
    )
    .returning({ id: incidents.id });
  return updated ?? null;
}

export async function findIncidentCorrelationCandidates(input: {
  district: string | null;
  incidentType: string | null;
  locationText?: string | null;
  publishedAt: Date | null;
}) {
  if ((!input.district && !input.locationText) || !input.incidentType)
    return [];
  const earliest = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const locationCondition = input.district
    ? eq(incidents.district, input.district)
    : sql<boolean>`${incidents.district} is not null and lower(${input.locationText ?? ""}) like '%' || lower(${incidents.district}) || '%'`;
  return db
    .select({ id: incidents.id })
    .from(incidents)
    .where(
      and(
        eq(incidents.country, "Bangladesh"),
        locationCondition,
        eq(incidents.incidentType, input.incidentType),
        gte(incidents.createdAt, earliest),
      ),
    )
    .orderBy(desc(incidents.updatedAt))
    .limit(2);
}

export async function findUniqueDistrictMention(locationText: string) {
  type DistrictMention = {
    district: string;
    division: string | null;
  };
  const result = await db.execute(sql<DistrictMention>`
    select district.name as district, division.name as division
    from administrative_areas as district
    left join administrative_areas as division
      on division.code = district.parent_code
    where district.level = 'district'
      and lower(${locationText}) like '%' || lower(district.name) || '%'
    order by char_length(district.name) desc
    limit 2
  `);
  const rows = result.rows as DistrictMention[];
  return rows.length === 1 ? rows[0] : null;
}

export async function createAutomaticIncident(input: {
  district: string | null;
  division: string | null;
  excerpt: string | null;
  incidentType: string | null;
  observationId: string;
  occurredAt: Date | null;
  origin: "automatic" | "user_report";
  rawReport?: string | null;
  reference?: string | null;
  sourceUrl: string | null;
  sourceType: "community" | "reliefweb";
  title: string | null;
}) {
  const incidentId = crypto.randomUUID();
  const reference = input.reference ?? generateIncidentReference();
  const insertIncident = db
    .insert(incidents)
    .values({
      district: input.district,
      division: input.division ?? "Unknown",
      extractionStatus: "pending",
      incidentType: input.incidentType,
      origin: input.origin,
      occurredAt: input.occurredAt,
      occurredAtPrecision: input.occurredAt ? "approximate" : "unknown",
      rawReport:
        input.rawReport ??
        JSON.stringify({
          excerpt: input.excerpt,
          observationId: input.observationId,
          title: input.title,
        }),
      reference,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      title: input.title,
      verificationStatus: "agent_review",
    })
    .returning({ id: incidents.id });
  const linkObservation = db
    .update(sourceObservations)
    .set({
      district: input.district,
      division: input.division,
      incidentId,
    })
    .where(eq(sourceObservations.id, input.observationId));
  const insertAudit = db.insert(auditEvents).select(sql`
    select
      gen_random_uuid(),
      ${incidentId}::uuid,
      null,
      'report.created',
      ${JSON.stringify({ observationId: input.observationId })}::jsonb,
      now()
    where ${input.origin} = 'user_report'
  `);
  const [inserted] = await db.batch([
    insertIncident,
    linkObservation,
    insertAudit,
  ]);
  return inserted[0] ?? null;
}

export async function recordCommunityReportCorrelation(
  incidentId: string,
  observationId: string,
) {
  await db.insert(auditEvents).select(sql`
    select
      gen_random_uuid(),
      ${incidentId}::uuid,
      null,
      'report.created',
      ${JSON.stringify({ observationId })}::jsonb,
      now()
    where not exists (
      select 1
      from audit_events
      where incident_id = ${incidentId}::uuid
        and event_type = 'report.created'
        and metadata->>'observationId' = ${observationId}
    )
  `);
}

export async function applyAgentClassification(
  incidentId: string,
  values: {
    district: string | null;
    division: string | null;
    incidentType: string | null;
    locationText: string | null;
    modelId: string | null;
    needs: string[];
    occurredAt: Date | null;
    occurredAtPrecision: "approximate" | "exact" | "unknown";
    riskFlags: NewIncident["riskFlags"];
    summary: string | null;
    title: string | null;
    unknowns: string[];
  },
) {
  const [updated] = await db
    .update(incidents)
    .set({
      ...values,
      division: values.division ?? "Unknown",
      extractionStatus: "complete",
      updatedAt: new Date(),
      verificationStatus: "agent_review",
    })
    .where(
      and(eq(incidents.id, incidentId), eq(incidents.factsApproved, false)),
    )
    .returning({ id: incidents.id });
  return updated ?? null;
}
