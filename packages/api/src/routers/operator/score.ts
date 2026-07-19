import { listEvidenceForIncident } from "@my-better-t-app/db/queries/evidence";
import {
  getIncidentForOperator,
  updateIncidentScores,
} from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { evaluateEvidenceGate } from "../../domain/incidents/approval.js";
import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  OCCURRENCE_PRECISIONS,
} from "../../domain/incidents/constants.js";
import type { ConfidenceEvidence } from "../../domain/scoring/types.js";
import { calculateUrgency } from "../../domain/scoring/urgency.js";
import { operatorProcedure } from "../../index.js";

const breakdownSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    points: z.number().int(),
  })
  .strict();

const scoreViewSchema = z
  .object({
    approvalConditions: z.array(
      z
        .object({
          key: z.string(),
          label: z.string(),
          passed: z.boolean(),
        })
        .strict(),
    ),
    confidence: z
      .object({
        breakdown: z.array(breakdownSchema),
        label: z.enum(["Unverified", "Needs Review", "Corroborated"]),
        score: z.number().int().min(0).max(100),
      })
      .strict(),
    factsApproved: z.boolean(),
    isStale: z.boolean(),
    storedConfidenceScore: z.number().int().min(0).max(100),
    storedUrgencyScore: z.number().int().min(0).max(100),
    urgency: z
      .object({
        breakdown: z.array(breakdownSchema),
        label: z.enum(["Low", "Medium", "High", "Critical"]),
        score: z.number().int().min(0).max(100),
      })
      .strict(),
  })
  .strict();

const incidentIdInputSchema = z.object({ incidentId: z.uuid() }).strict();

async function calculateScoreView(incidentId: string) {
  const [incident, evidence] = await Promise.all([
    getIncidentForOperator(incidentId),
    listEvidenceForIncident(incidentId),
  ]);
  if (!incident) {
    throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
  }

  const parsedEvidence: ConfidenceEvidence[] = evidence.map((item) => ({
    id: item.id,
    isIndependent: item.isIndependent,
    relationship: z.enum(EVIDENCE_RELATIONSHIPS).parse(item.relationship),
    sourceCategory: z
      .enum(EVIDENCE_SOURCE_CATEGORIES)
      .parse(item.sourceCategory),
  }));
  const evidenceGate = evaluateEvidenceGate({
    district: incident.district,
    evidence: parsedEvidence,
    locationText: incident.locationText,
    occurredAt: incident.occurredAt,
    occurredAtPrecision: z
      .enum(OCCURRENCE_PRECISIONS)
      .parse(incident.occurredAtPrecision),
  });
  const urgency = calculateUrgency({ riskFlags: incident.riskFlags });

  return scoreViewSchema.parse({
    approvalConditions: evidenceGate.conditions,
    confidence: {
      breakdown: evidenceGate.confidence.breakdown,
      label: evidenceGate.confidence.label,
      score: evidenceGate.confidence.score,
    },
    factsApproved: incident.factsApproved,
    isStale:
      evidenceGate.confidence.score !== incident.confidenceScore ||
      urgency.score !== incident.urgencyScore,
    storedConfidenceScore: incident.confidenceScore,
    storedUrgencyScore: incident.urgencyScore,
    urgency,
  });
}

export const scoreRouter = {
  get: operatorProcedure
    .input(incidentIdInputSchema)
    .output(scoreViewSchema)
    .handler(({ input }) => calculateScoreView(input.incidentId)),

  recalculate: operatorProcedure
    .input(incidentIdInputSchema)
    .output(scoreViewSchema)
    .handler(async ({ context, input }) => {
      const calculated = await calculateScoreView(input.incidentId);
      const updated = await updateIncidentScores(
        input.incidentId,
        {
          confidenceScore: calculated.confidence.score,
          urgencyScore: calculated.urgency.score,
        },
        context.actor.id,
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
      }
      return calculateScoreView(input.incidentId);
    }),
};
