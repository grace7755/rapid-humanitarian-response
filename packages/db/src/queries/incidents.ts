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
  sourceType?: "community";
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
      verificationRevision: incidents.verificationRevision,
      verificationExpiresAt: incidents.verificationExpiresAt,
      consensusAt: incidents.consensusAt,
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

export async function getIncidentForObserver(incidentId: string) {
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
      verificationRevision: incidents.verificationRevision,
      verificationExpiresAt: incidents.verificationExpiresAt,
      consensusAt: incidents.consensusAt,
      priorityLevel: incidents.priorityLevel,
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

export async function updateIncidentAgentAssessment(
  incidentId: string,
  values: {
    confidenceScore?: number;
    priorityLevel?: "P0" | "P1" | "P2" | "P3";
    urgencyScore?: number;
  },
) {
  const [updated] = await db
    .update(incidents)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(incidents.id, incidentId))
    .returning({ id: incidents.id });
  return updated ?? null;
}

export async function startAutonomousVerification(incidentId: string) {
  const jobId = crypto.randomUUID();
  // The revision bump and its six-hour expiry job are written in one statement so a
  // revision can never exist without the job that expires it. Neon HTTP has no
  // interactive transactions, so this uses the same CTE pattern as
  // insertSourceObservationAndEnqueueCorrelation.
  const result = await db.execute(sql<{ id: string; revision: number }>`
    with bumped as (
      update incidents
      set
        consensus_at = null,
        state = 'verifying',
        updated_at = now(),
        verification_expires_at = now() + interval '6 hours',
        verification_revision = verification_revision + 1,
        verification_status = 'pending'
      where id = ${incidentId}::uuid
      returning id, verification_revision, verification_expires_at
    ), enqueued as (
      insert into workflow_jobs (
        id,
        job_type,
        payload,
        idempotency_key,
        available_at
      )
      select
        ${jobId}::uuid,
        'verification_consensus',
        jsonb_build_object(
          'expire', true,
          'incidentId', bumped.id::text,
          'revision', bumped.verification_revision
        ),
        'verification_expiry:' || bumped.id::text || ':' || bumped.verification_revision::text,
        bumped.verification_expires_at
      from bumped
      on conflict (idempotency_key) do nothing
      returning id
    )
    select id, verification_revision as revision
    from bumped
  `);

  const row = result.rows[0] as { id: string; revision: number } | undefined;
  if (!row) return null;
  // Postgres returns integers as strings over some drivers, so coerce and verify
  // rather than trusting the raw value: callers key idempotent job names off it.
  const revision = Number(row.revision);
  if (!Number.isInteger(revision) || revision < 1) {
    throw new Error("VERIFICATION_REVISION_INVALID");
  }
  return { id: row.id, revision };
}

export async function applyAutonomousConsensus(
  incidentId: string,
  revision: number,
  result: {
    confidenceScore: number;
    status: "corroborated" | "contradicted" | "inconclusive" | "expired";
  },
) {
  const now = new Date();
  const state =
    result.status === "corroborated"
      ? "corroborated"
      : result.status === "contradicted"
        ? "contradicted"
        : "inconclusive";
  const [updated] = await db
    .update(incidents)
    .set({
      confidenceScore: result.confidenceScore,
      consensusAt: now,
      state,
      updatedAt: now,
      verificationStatus: result.status,
    })
    .where(
      and(
        eq(incidents.id, incidentId),
        eq(incidents.verificationRevision, revision),
      ),
    )
    .returning({ id: incidents.id, state: incidents.state });
  return updated ?? null;
}

export async function markIncidentEscalationReady(
  incidentId: string,
  revision: number,
) {
  const [updated] = await db
    .update(incidents)
    .set({ state: "escalation_ready", updatedAt: new Date() })
    .where(
      and(
        eq(incidents.id, incidentId),
        eq(incidents.verificationRevision, revision),
        eq(incidents.verificationStatus, "corroborated"),
      ),
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
      verificationStatus: "pending",
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
      verificationStatus: "pending",
    })
    .where(eq(incidents.id, incidentId))
    .returning({ id: incidents.id });
  return updated ?? null;
}
