import {
  getIncidentForObserver,
  listIncidents,
} from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  AUTONOMOUS_CASE_STATES,
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
  VERIFICATION_STATUSES,
} from "../../domain/incidents/constants.js";
import { riskFlagsSchema } from "../../domain/incidents/risk-flags.js";
import { observerProcedure } from "../../index.js";

const incidentListItemSchema = z
  .object({
    confidenceScore: z.number().int().min(0).max(100),
    createdAt: z.string(),
    district: z.string().nullable(),
    extractionStatus: z.enum(["pending", "complete", "failed"]),
    id: z.uuid(),
    incidentType: z.enum(INCIDENT_TYPES).nullable(),
    priorityLevel: z.enum(["P0", "P1", "P2", "P3"]),
    reference: z.string(),
    state: z.enum(AUTONOMOUS_CASE_STATES),
    title: z.string().nullable(),
    updatedAt: z.string(),
    urgencyScore: z.number().int().min(0).max(100),
    verificationStatus: z.enum(VERIFICATION_STATUSES),
  })
  .strict();

const incidentDetailSchema = incidentListItemSchema
  .extend({
    affectedEstimate: z.number().int().nonnegative().nullable(),
    consensusAt: z.string().nullable(),
    country: z.literal("Bangladesh"),
    districtCode: z.string().nullable(),
    division: z.string(),
    divisionCode: z.string().nullable(),
    locationText: z.string().nullable(),
    modelId: z.string().nullable(),
    needs: z.array(z.enum(INCIDENT_NEEDS)),
    occurredAt: z.string().nullable(),
    occurredAtPrecision: z.enum(OCCURRENCE_PRECISIONS),
    origin: z.enum(["user_report", "automatic"]),
    rawReport: z.string(),
    riskFlags: riskFlagsSchema,
    sourceType: z.enum(["community", "reliefweb"]),
    sourceUrl: z.string().nullable(),
    summary: z.string().nullable(),
    unknowns: z.array(z.string()),
    verificationExpiresAt: z.string().nullable(),
    verificationRevision: z.number().int().nonnegative(),
  })
  .strict();

function serializeListIncident(
  incident: Awaited<ReturnType<typeof listIncidents>>[number],
) {
  return incidentListItemSchema.parse({
    ...incident,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  });
}

async function requireIncident(incidentId: string) {
  const incident = await getIncidentForObserver(incidentId);
  if (!incident) {
    throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
  }
  return incident;
}

function serializeIncidentDetail(
  incident: NonNullable<Awaited<ReturnType<typeof getIncidentForObserver>>>,
) {
  return incidentDetailSchema.parse({
    ...incident,
    consensusAt: incident.consensusAt?.toISOString() ?? null,
    createdAt: incident.createdAt.toISOString(),
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    updatedAt: incident.updatedAt.toISOString(),
    verificationExpiresAt:
      incident.verificationExpiresAt?.toISOString() ?? null,
  });
}

export const incidentObserverRouter = {
  get: observerProcedure
    .input(z.object({ incidentId: z.uuid() }).strict())
    .output(incidentDetailSchema)
    .handler(async ({ input }) =>
      serializeIncidentDetail(await requireIncident(input.incidentId)),
    ),
  list: observerProcedure
    .input(
      z
        .object({ state: z.enum(AUTONOMOUS_CASE_STATES).optional() })
        .strict()
        .default({}),
    )
    .output(z.array(incidentListItemSchema))
    .handler(async ({ input }) =>
      (await listIncidents(input)).map(serializeListIncident),
    ),
};
