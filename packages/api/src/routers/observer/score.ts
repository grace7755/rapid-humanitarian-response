import { listEvidenceForIncident } from "@my-better-t-app/db/queries/evidence";
import { getIncidentForObserver } from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  OCCURRENCE_PRECISIONS,
} from "../../domain/incidents/constants.js";
import { calculateConfidence } from "../../domain/scoring/confidence.js";
import type { ConfidenceEvidence } from "../../domain/scoring/types.js";
import { calculateUrgency } from "../../domain/scoring/urgency.js";
import { observerProcedure } from "../../index.js";

const breakdownSchema = z
  .object({ key: z.string(), label: z.string(), points: z.number().int() })
  .strict();
const scoreViewSchema = z
  .object({
    confidence: z
      .object({
        breakdown: z.array(breakdownSchema),
        label: z.enum(["Unverified", "Needs Review", "Corroborated"]),
        score: z.number().int().min(0).max(100),
      })
      .strict(),
    urgency: z
      .object({
        breakdown: z.array(breakdownSchema),
        label: z.enum(["Low", "Medium", "High", "Critical"]),
        score: z.number().int().min(0).max(100),
      })
      .strict(),
  })
  .strict();

export const scoreObserverRouter = {
  get: observerProcedure
    .input(z.object({ incidentId: z.uuid() }).strict())
    .output(scoreViewSchema)
    .handler(async ({ input }) => {
      const [incident, evidence] = await Promise.all([
        getIncidentForObserver(input.incidentId),
        listEvidenceForIncident(input.incidentId),
      ]);
      if (!incident)
        throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
      const parsedEvidence: ConfidenceEvidence[] = evidence.map((item) => ({
        id: item.id,
        isIndependent: item.isIndependent,
        relationship: z.enum(EVIDENCE_RELATIONSHIPS).parse(item.relationship),
        sourceCategory: z
          .enum(EVIDENCE_SOURCE_CATEGORIES)
          .parse(item.sourceCategory),
      }));
      return scoreViewSchema.parse({
        confidence: calculateConfidence({
          district: incident.district,
          evidence: parsedEvidence,
          locationText: incident.locationText,
          occurredAt: incident.occurredAt,
          occurredAtPrecision: z
            .enum(OCCURRENCE_PRECISIONS)
            .parse(incident.occurredAtPrecision),
        }),
        urgency: calculateUrgency({ riskFlags: incident.riskFlags }),
      });
    }),
};
