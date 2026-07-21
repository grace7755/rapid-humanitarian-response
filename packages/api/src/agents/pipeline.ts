import {
  addAgentEvidence,
  listEvidenceForIncident,
} from "@my-better-t-app/db/queries/evidence";
import {
  applyAgentClassification,
  createAutomaticIncident,
  findIncidentCorrelationCandidates,
  findUniqueDistrictMention,
  getIncidentForOperator,
  recordCommunityReportCorrelation,
  updateIncidentAgentAssessment,
} from "@my-better-t-app/db/queries/incidents";
import {
  getMonitoringSource,
  getObservationForAgent,
  insertSourceObservationAndEnqueueCorrelation,
  linkObservationToIncident,
  listObservationsForIncident,
  updateMonitoringSourcePoll,
} from "@my-better-t-app/db/queries/monitoring";
import { enqueueWorkflowJob } from "@my-better-t-app/db/queries/workflows";
import { env } from "@my-better-t-app/env/server";
import { z } from "zod";

import { evaluateEvidenceGate } from "../domain/incidents/approval.js";
import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
} from "../domain/incidents/constants.js";
import { riskFlagsSchema } from "../domain/incidents/review.js";
import type { ConfidenceEvidence } from "../domain/scoring/types.js";
import { calculateUrgency } from "../domain/scoring/urgency.js";
import { OpenRouterModelGateway } from "../services/openrouter.js";
import { createConnector, hashObservation } from "./connectors.js";
import type { AgentContext, ModelGateway } from "./contracts.js";
import { safeErrorCode } from "./errors.js";

const sourceJobSchema = z.object({ sourceId: z.uuid() }).strict();
const observationJobSchema = z
  .object({ incidentId: z.uuid().optional(), observationId: z.uuid() })
  .strict();
const assessmentJobSchema = z
  .object({ incidentId: z.uuid(), observationId: z.uuid() })
  .strict();

const classificationSchema = z
  .object({
    district: z.string().max(100).nullable(),
    division: z.string().max(100).nullable(),
    incidentType: z.enum(INCIDENT_TYPES).nullable(),
    locationText: z.string().max(200).nullable(),
    needs: z.array(z.enum(INCIDENT_NEEDS)).max(INCIDENT_NEEDS.length),
    occurredAt: z.iso.datetime().nullable(),
    occurredAtPrecision: z.enum(OCCURRENCE_PRECISIONS),
    riskFlags: riskFlagsSchema,
    summary: z.string().max(1_200).nullable(),
    title: z.string().max(160).nullable(),
    unknowns: z.array(z.string().max(200)).max(10),
  })
  .strict();

function textFromObservation(
  observation: NonNullable<Awaited<ReturnType<typeof getObservationForAgent>>>,
) {
  const rawReport = observation.restrictedPayload.rawReport;
  return [
    observation.title,
    observation.excerpt,
    typeof rawReport === "string" ? rawReport : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n")
    .slice(0, 8_000);
}

function heuristicClassification(
  observation: NonNullable<Awaited<ReturnType<typeof getObservationForAgent>>>,
) {
  const text = textFromObservation(observation);
  const lower = text.toLowerCase();
  const detectedType = INCIDENT_TYPES.find((type) =>
    lower.includes(type.replaceAll("_", " ")),
  );
  return classificationSchema.parse({
    district: observation.district,
    division: observation.division,
    incidentType: observation.incidentTypeCandidate ?? detectedType ?? null,
    locationText: observation.district,
    needs: [
      ...(lower.includes("rescue") ? (["rescue"] as const) : []),
      ...(lower.includes("water") ? (["water"] as const) : []),
      ...(lower.includes("medical") || lower.includes("injur")
        ? (["medical"] as const)
        : []),
      ...(lower.includes("shelter") ? (["shelter"] as const) : []),
    ],
    occurredAt: observation.publishedAt?.toISOString() ?? null,
    occurredAtPrecision: observation.publishedAt ? "approximate" : "unknown",
    riskFlags: {
      accessBlocked:
        /road|access|bridge/.test(lower) && /block|close|damage/.test(lower),
      displacement: /displac|homeless|shelter/.test(lower),
      noFood: /no food|food shortage/.test(lower),
      noSafeWater: /no (safe |clean )?water|water shortage/.test(lower),
      peopleTrapped: /trapped|stranded/.test(lower),
      urgentMedicalNeed: /injur|medical emergency|critical condition/.test(
        lower,
      ),
      vulnerableGroupsReported: /child|children|elderly|pregnant|disabled/.test(
        lower,
      ),
    },
    summary: text ? text.slice(0, 1_200) : null,
    title: observation.title ?? (text ? text.slice(0, 160) : null),
    unknowns: [
      ...(!observation.district ? ["Exact district"] : []),
      ...(!observation.publishedAt ? ["Time of incident"] : []),
    ],
  });
}

async function modelClassification(
  model: ModelGateway,
  observation: NonNullable<Awaited<ReturnType<typeof getObservationForAgent>>>,
) {
  return model.generateStructured({
    schema: classificationSchema,
    system:
      "Extract only explicitly supported emergency facts for Bangladesh. Never infer missing location, time, casualties, or needs. Use null/unknown and list unknowns. Return JSON only.",
    user: textFromObservation(observation),
  });
}

export async function runMonitoringAgent(
  _context: AgentContext,
  rawInput: Record<string, unknown>,
) {
  const input = sourceJobSchema.parse(rawInput);
  const source = await getMonitoringSource(input.sourceId);
  if (!source?.enabled) throw new Error("SOURCE_DISABLED");
  const connector = createConnector(source.connectorType, fetch, {
    reliefWebAppName: env.RELIEFWEB_APP_NAME,
  });
  try {
    const polled = await connector.poll({
      cursor: source.cursor,
      endpoint: source.endpoint,
      signal: AbortSignal.timeout(20_000),
    });
    let createdCount = 0;
    for (const observation of polled.observations) {
      const observationRecord =
        await insertSourceObservationAndEnqueueCorrelation({
          canonicalUrl: observation.canonicalUrl,
          contentHash: await hashObservation(observation),
          country: "Bangladesh",
          district: observation.district,
          division: observation.division,
          excerpt: observation.excerpt,
          externalId: observation.externalId,
          incidentId: null,
          incidentTypeCandidate: observation.incidentTypeCandidate,
          publishedAt: observation.publishedAt,
          restrictedPayload: observation.restrictedPayload,
          sourceId: source.id,
          title: observation.title,
        });
      if (observationRecord?.created) createdCount += 1;
    }
    await updateMonitoringSourcePoll(source.id, {
      cursor: polled.cursor,
      succeeded: true,
    });
    return { createdCount, fetchedCount: polled.observations.length };
  } catch (error) {
    await updateMonitoringSourcePoll(source.id, {
      errorCode: safeErrorCode(error),
      succeeded: false,
    });
    throw error;
  }
}

export async function runCorrelationAgent(
  _context: AgentContext,
  rawInput: Record<string, unknown>,
) {
  const input = observationJobSchema.parse(rawInput);
  const observation = await getObservationForAgent(input.observationId);
  if (!observation) throw new Error("OBSERVATION_NOT_FOUND");
  let incidentId = observation.incidentId;
  if (!incidentId) {
    const observationText = textFromObservation(observation);
    const normalizedText = observationText.toLowerCase();
    const mentionedLocation = observation.district
      ? null
      : await findUniqueDistrictMention(observationText);
    const district =
      observation.district ?? mentionedLocation?.district ?? null;
    const division =
      observation.division ?? mentionedLocation?.division ?? null;
    const incidentType =
      observation.incidentTypeCandidate ??
      INCIDENT_TYPES.find((type) =>
        normalizedText.includes(type.replaceAll("_", " ")),
      ) ??
      null;
    const candidates = await findIncidentCorrelationCandidates({
      district,
      incidentType,
      locationText: observationText,
      publishedAt: observation.publishedAt,
    });
    const candidate = candidates[0];
    if (candidates.length === 1 && candidate) {
      incidentId = candidate.id;
      await linkObservationToIncident(observation.id, incidentId, {
        district,
        division,
      });
      if (observation.connectorType === "community") {
        await recordCommunityReportCorrelation(incidentId, observation.id);
      }
    } else {
      const isCommunity = observation.connectorType === "community";
      const incident = await createAutomaticIncident({
        district,
        division,
        excerpt: observation.excerpt,
        incidentType,
        observationId: observation.id,
        occurredAt: observation.publishedAt,
        origin: isCommunity ? "user_report" : "automatic",
        rawReport:
          typeof observation.restrictedPayload.rawReport === "string"
            ? observation.restrictedPayload.rawReport
            : null,
        reference: isCommunity ? observation.externalId : null,
        sourceUrl: observation.canonicalUrl,
        sourceType: isCommunity ? "community" : "reliefweb",
        title: observation.title,
      });
      if (!incident) throw new Error("INCIDENT_CREATE_FAILED");
      incidentId = incident.id;
    }
  }
  await enqueueWorkflowJob({
    idempotencyKey: `classification:${incidentId}:${observation.id}`,
    jobType: "classification",
    payload: { incidentId, observationId: observation.id },
  });
  return { incidentId };
}

export async function runClassificationAgent(
  _context: AgentContext,
  rawInput: Record<string, unknown>,
  model: ModelGateway = new OpenRouterModelGateway(),
) {
  const input = observationJobSchema.parse(rawInput);
  if (!input.incidentId) throw new Error("INCIDENT_ID_REQUIRED");
  const observation = await getObservationForAgent(input.observationId);
  if (!observation) throw new Error("OBSERVATION_NOT_FOUND");

  let classification = heuristicClassification(observation);
  let modelId: string | null = null;
  let modelProvider: string | null = null;
  try {
    const modeled = await modelClassification(model, observation);
    classification = modeled.output;
    modelId = modeled.modelId;
    modelProvider = modeled.provider;
  } catch (error) {
    if (safeErrorCode(error) !== "MODEL_NOT_CONFIGURED") throw error;
  }
  const updated = await applyAgentClassification(input.incidentId, {
    ...classification,
    modelId,
    occurredAt: classification.occurredAt
      ? new Date(classification.occurredAt)
      : null,
  });
  await enqueueWorkflowJob({
    idempotencyKey: `verification:${input.incidentId}:${input.observationId}`,
    jobType: "verification",
    payload: {
      incidentId: input.incidentId,
      observationId: input.observationId,
    },
  });
  return {
    incidentId: input.incidentId,
    modelId,
    modelProvider,
    skipped: !updated,
  };
}

function sourceCategory(trustTier: string) {
  if (trustTier === "official") return "official_authority";
  if (trustTier === "humanitarian") return "established_humanitarian";
  if (trustTier === "established_news") return "established_news";
  if (trustTier === "local_news") return "local_news";
  if (trustTier === "community") return "community_eyewitness";
  return "unknown";
}

export async function runVerificationAgent(
  context: AgentContext,
  rawInput: Record<string, unknown>,
) {
  const input = assessmentJobSchema.parse(rawInput);
  const [incident, observations, existingEvidence] = await Promise.all([
    getIncidentForOperator(input.incidentId),
    listObservationsForIncident(input.incidentId),
    listEvidenceForIncident(input.incidentId),
  ]);
  if (!incident) throw new Error("INCIDENT_NOT_FOUND");

  const knownDomains = new Set(
    existingEvidence.map((item) => item.publisherDomain),
  );
  for (const observation of observations) {
    if (!observation.canonicalUrl) continue;
    const publisherDomain = new URL(
      observation.canonicalUrl,
    ).hostname.toLowerCase();
    await addAgentEvidence({
      agentRunId: context.runId,
      incidentId: input.incidentId,
      isIndependent: !knownDomains.has(publisherDomain),
      observationId: observation.id,
      publisherDomain,
      sourceCategory: sourceCategory(observation.trustTier),
      sourceName: observation.sourceName,
      url: observation.canonicalUrl,
    });
    knownDomains.add(publisherDomain);
  }

  const evidence = await listEvidenceForIncident(input.incidentId);
  const parsedEvidence: ConfidenceEvidence[] = evidence.map((item) => ({
    id: item.id,
    isIndependent: item.isIndependent,
    relationship: z.enum(EVIDENCE_RELATIONSHIPS).parse(item.relationship),
    sourceCategory: z
      .enum(EVIDENCE_SOURCE_CATEGORIES)
      .parse(item.sourceCategory),
  }));
  const gate = evaluateEvidenceGate({
    district: incident.district,
    evidence: parsedEvidence,
    locationText: incident.locationText,
    occurredAt: incident.occurredAt,
    occurredAtPrecision: z
      .enum(OCCURRENCE_PRECISIONS)
      .parse(incident.occurredAtPrecision),
  });
  const verificationStatus =
    gate.confidence.label === "Corroborated"
      ? "agent_corroborated"
      : "agent_review";
  const updated = await updateIncidentAgentAssessment(input.incidentId, {
    confidenceScore: gate.confidence.score,
    verificationStatus,
  });
  if (updated) {
    await enqueueWorkflowJob({
      idempotencyKey: `priority:${input.incidentId}:${input.observationId}`,
      jobType: "priority",
      payload: {
        incidentId: input.incidentId,
        observationId: input.observationId,
      },
    });
  }
  return {
    confidenceScore: gate.confidence.score,
    skipped: !updated,
    verificationStatus,
  };
}

export async function runPriorityAgent(
  _context: AgentContext,
  rawInput: Record<string, unknown>,
) {
  const input = assessmentJobSchema.parse(rawInput);
  const incident = await getIncidentForOperator(input.incidentId);
  if (!incident) throw new Error("INCIDENT_NOT_FOUND");
  const urgency = calculateUrgency({ riskFlags: incident.riskFlags });
  const priorityLevel =
    urgency.score >= 75
      ? "P0"
      : urgency.score >= 50
        ? "P1"
        : urgency.score >= 25
          ? "P2"
          : "P3";
  const updated = await updateIncidentAgentAssessment(input.incidentId, {
    priorityLevel,
    urgencyScore: urgency.score,
  });
  return { priorityLevel, skipped: !updated, urgencyScore: urgency.score };
}
