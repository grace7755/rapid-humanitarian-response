import { asc, desc, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import {
  incidents,
  monitoringSources,
  type NewSourceObservation,
  sourceObservations,
} from "../schema/index.js";

export async function listEnabledMonitoringSources() {
  return db
    .select()
    .from(monitoringSources)
    .where(eq(monitoringSources.enabled, true))
    .orderBy(asc(monitoringSources.key));
}

export async function listMonitoringSources() {
  return db
    .select()
    .from(monitoringSources)
    .orderBy(asc(monitoringSources.key));
}

export async function setMonitoringSourceEnabled(
  sourceId: string,
  enabled: boolean,
) {
  const [updated] = await db
    .update(monitoringSources)
    .set({ enabled, updatedAt: new Date() })
    .where(eq(monitoringSources.id, sourceId))
    .returning({
      enabled: monitoringSources.enabled,
      id: monitoringSources.id,
    });
  return updated ?? null;
}

export async function getMonitoringSource(sourceId: string) {
  const [source] = await db
    .select()
    .from(monitoringSources)
    .where(eq(monitoringSources.id, sourceId))
    .limit(1);
  return source ?? null;
}

export async function updateMonitoringSourcePoll(
  sourceId: string,
  values: {
    cursor?: string | null;
    errorCode?: string | null;
    succeeded: boolean;
  },
) {
  const now = new Date();
  const [updated] = await db
    .update(monitoringSources)
    .set({
      cursor: values.cursor,
      lastErrorCode: values.errorCode ?? null,
      lastPolledAt: now,
      lastSuccessAt: values.succeeded ? now : undefined,
      updatedAt: now,
    })
    .where(eq(monitoringSources.id, sourceId))
    .returning({ id: monitoringSources.id });
  return updated ?? null;
}

export async function insertSourceObservationAndEnqueueCorrelation(
  input: Omit<NewSourceObservation, "createdAt" | "id" | "observedAt">,
) {
  const observationId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const result = await db.execute(sql<{ created: boolean; id: string }>`
    with inserted as (
      insert into source_observations (
        id,
        source_id,
        incident_id,
        external_id,
        canonical_url,
        content_hash,
        title,
        excerpt,
        published_at,
        country,
        division,
        district,
        incident_type_candidate,
        restricted_payload
      ) values (
        ${observationId}::uuid,
        ${input.sourceId}::uuid,
        ${input.incidentId ?? null}::uuid,
        ${input.externalId ?? null},
        ${input.canonicalUrl ?? null},
        ${input.contentHash},
        ${input.title ?? null},
        ${input.excerpt ?? null},
        ${input.publishedAt ?? null},
        ${input.country ?? "Bangladesh"},
        ${input.division ?? null},
        ${input.district ?? null},
        ${input.incidentTypeCandidate ?? null},
        ${JSON.stringify(input.restrictedPayload ?? {})}::jsonb
      )
      on conflict do nothing
      returning id
    ), selected as (
      select id, true as created from inserted
      union all
      select existing.id, false as created
      from source_observations as existing
      where existing.source_id = ${input.sourceId}::uuid
        and (
          existing.content_hash = ${input.contentHash}
          or (
            ${input.externalId ?? null}::text is not null
            and existing.external_id = ${input.externalId ?? null}
          )
        )
        and not exists (select 1 from inserted)
      limit 1
    ), enqueued as (
      insert into workflow_jobs (
        id,
        job_type,
        payload,
        idempotency_key
      )
      select
        ${jobId}::uuid,
        'correlation',
        jsonb_build_object('observationId', selected.id),
        'correlation:' || selected.id::text
      from selected
      on conflict (idempotency_key) do nothing
      returning id
    )
    select id, created from selected
  `);
  return result.rows[0] ?? null;
}

export async function listObservationsForIncident(incidentId: string) {
  return db
    .select({
      canonicalUrl: sourceObservations.canonicalUrl,
      connectorType: monitoringSources.connectorType,
      contentHash: sourceObservations.contentHash,
      district: sourceObservations.district,
      division: sourceObservations.division,
      excerpt: sourceObservations.excerpt,
      externalId: sourceObservations.externalId,
      id: sourceObservations.id,
      observedAt: sourceObservations.observedAt,
      publishedAt: sourceObservations.publishedAt,
      sourceKey: monitoringSources.key,
      sourceName: monitoringSources.name,
      title: sourceObservations.title,
      trustTier: monitoringSources.trustTier,
    })
    .from(sourceObservations)
    .innerJoin(
      monitoringSources,
      eq(sourceObservations.sourceId, monitoringSources.id),
    )
    .where(eq(sourceObservations.incidentId, incidentId))
    .orderBy(desc(sourceObservations.observedAt));
}

export async function getObservationForAgent(observationId: string) {
  const [record] = await db
    .select({
      canonicalUrl: sourceObservations.canonicalUrl,
      connectorType: monitoringSources.connectorType,
      district: sourceObservations.district,
      division: sourceObservations.division,
      excerpt: sourceObservations.excerpt,
      externalId: sourceObservations.externalId,
      id: sourceObservations.id,
      incidentId: sourceObservations.incidentId,
      incidentTypeCandidate: sourceObservations.incidentTypeCandidate,
      publishedAt: sourceObservations.publishedAt,
      restrictedPayload: sourceObservations.restrictedPayload,
      sourceId: monitoringSources.id,
      sourceKey: monitoringSources.key,
      sourceName: monitoringSources.name,
      title: sourceObservations.title,
      trustTier: monitoringSources.trustTier,
    })
    .from(sourceObservations)
    .innerJoin(
      monitoringSources,
      eq(sourceObservations.sourceId, monitoringSources.id),
    )
    .where(eq(sourceObservations.id, observationId))
    .limit(1);
  return record ?? null;
}

export async function linkObservationToIncident(
  observationId: string,
  incidentId: string,
  location?: { district: string | null; division: string | null },
) {
  const linkObservation = db
    .update(sourceObservations)
    .set({
      district: location?.district ?? undefined,
      division: location?.division ?? undefined,
      incidentId,
    })
    .where(eq(sourceObservations.id, observationId))
    .returning({ id: sourceObservations.id });
  const invalidateApproval = db
    .update(incidents)
    .set({
      factsApproved: false,
      state: sql`case when ${incidents.factsApproved} and ${incidents.state} in ('corroborated', 'outreach_ready', 'contact_attempted') then 'reviewing' else ${incidents.state} end`,
      updatedAt: new Date(),
      verificationStatus: "agent_review",
    })
    .where(eq(incidents.id, incidentId));
  const [updatedRows] = await db.batch([linkObservation, invalidateApproval]);
  return updatedRows[0] ?? null;
}
