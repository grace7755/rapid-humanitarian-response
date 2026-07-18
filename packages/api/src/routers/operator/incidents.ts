import {
  getIncidentForOperator,
  listIncidents,
  startIncidentReview,
  updateIncidentReview,
  updateIncidentState,
} from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  CASE_STATES,
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
  PILOT_DISTRICTS,
} from "../../domain/incidents/constants.js";
import {
  getChangedReviewFields,
  reviewFieldsSchema,
  riskFlagsSchema,
} from "../../domain/incidents/review.js";
import { canTransitionIncident } from "../../domain/incidents/state-machine.js";
import type { CaseState } from "../../domain/incidents/types.js";
import { operatorProcedure } from "../../index.js";

const incidentListItemSchema = z
  .object({
    confidenceScore: z.number().int().min(0).max(100),
    createdAt: z.string(),
    district: z.enum(PILOT_DISTRICTS).nullable(),
    extractionStatus: z.enum(["pending", "complete", "failed"]),
    id: z.uuid(),
    incidentType: z.enum(INCIDENT_TYPES).nullable(),
    reference: z.string(),
    state: z.enum(CASE_STATES),
    title: z.string().nullable(),
    updatedAt: z.string(),
    urgencyScore: z.number().int().min(0).max(100),
  })
  .strict();

const incidentDetailSchema = incidentListItemSchema
  .extend({
    affectedEstimate: z.number().int().nonnegative().nullable(),
    country: z.literal("Bangladesh"),
    division: z.literal("Chattogram"),
    factsApproved: z.boolean(),
    locationText: z.string().nullable(),
    modelId: z.string().nullable(),
    needs: z.array(z.enum(INCIDENT_NEEDS)),
    occurredAt: z.string().nullable(),
    occurredAtPrecision: z.enum(OCCURRENCE_PRECISIONS),
    rawReport: z.string(),
    reviewedAt: z.string().nullable(),
    reviewedByUserId: z.string().nullable(),
    riskFlags: riskFlagsSchema,
    sourceType: z.enum(["community", "manual", "reliefweb"]),
    sourceUrl: z.string().nullable(),
    summary: z.string().nullable(),
    unknowns: z.array(z.string()),
  })
  .strict();

const incidentIdInputSchema = z.object({ incidentId: z.uuid() }).strict();

type IncidentListRecord = Awaited<ReturnType<typeof listIncidents>>[number];
type IncidentDetailRecord = NonNullable<
  Awaited<ReturnType<typeof getIncidentForOperator>>
>;

function serializeListIncident(incident: IncidentListRecord) {
  return incidentListItemSchema.parse({
    ...incident,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  });
}

function serializeIncidentDetail(incident: IncidentDetailRecord) {
  return incidentDetailSchema.parse({
    ...incident,
    createdAt: incident.createdAt.toISOString(),
    occurredAt: incident.occurredAt?.toISOString() ?? null,
    reviewedAt: incident.reviewedAt?.toISOString() ?? null,
    updatedAt: incident.updatedAt.toISOString(),
  });
}

async function requireIncident(incidentId: string) {
  const incident = await getIncidentForOperator(incidentId);
  if (!incident) {
    throw new ORPCError("NOT_FOUND", {
      message: "Incident not found.",
    });
  }
  return incident;
}

export const incidentRouter = {
  changeState: operatorProcedure
    .input(
      z
        .object({
          incidentId: z.uuid(),
          toState: z.enum(CASE_STATES),
        })
        .strict(),
    )
    .output(incidentDetailSchema)
    .handler(async ({ context, input }) => {
      const current = await requireIncident(input.incidentId);
      const fromState = current.state as CaseState;
      if (!canTransitionIncident(fromState, input.toState)) {
        throw new ORPCError("CONFLICT", {
          message: `The incident cannot move from ${fromState} to ${input.toState}.`,
        });
      }

      const changed = await updateIncidentState(
        input.incidentId,
        fromState,
        input.toState,
        context.actor.id,
      );
      if (!changed) {
        throw new ORPCError("CONFLICT", {
          message: "The incident changed. Reload and try again.",
        });
      }

      return serializeIncidentDetail(await requireIncident(input.incidentId));
    }),

  get: operatorProcedure
    .input(incidentIdInputSchema)
    .output(incidentDetailSchema)
    .handler(async ({ input }) =>
      serializeIncidentDetail(await requireIncident(input.incidentId)),
    ),

  list: operatorProcedure
    .input(
      z
        .object({
          state: z.enum(CASE_STATES).optional(),
        })
        .strict()
        .default({}),
    )
    .output(z.array(incidentListItemSchema))
    .handler(async ({ input }) => {
      const incidents = await listIncidents(input);
      return incidents.map(serializeListIncident);
    }),

  startReview: operatorProcedure
    .input(incidentIdInputSchema)
    .output(incidentDetailSchema)
    .handler(async ({ context, input }) => {
      const current = await requireIncident(input.incidentId);
      if (!canTransitionIncident(current.state as CaseState, "reviewing")) {
        throw new ORPCError("CONFLICT", {
          message: "Only a submitted incident can start review.",
        });
      }

      const updated = await startIncidentReview(
        input.incidentId,
        context.actor.id,
      );
      if (!updated) {
        throw new ORPCError("CONFLICT", {
          message: "The incident changed. Reload and try again.",
        });
      }

      return serializeIncidentDetail(await requireIncident(input.incidentId));
    }),

  update: operatorProcedure
    .input(
      z
        .object({
          incidentId: z.uuid(),
          values: reviewFieldsSchema,
        })
        .strict(),
    )
    .output(incidentDetailSchema)
    .handler(async ({ context, input }) => {
      const current = await requireIncident(input.incidentId);
      const changedFields = getChangedReviewFields(current, input.values);
      if (changedFields.length === 0) {
        return serializeIncidentDetail(current);
      }

      const updated = await updateIncidentReview(
        input.incidentId,
        {
          ...input.values,
          occurredAt:
            input.values.occurredAt === undefined
              ? undefined
              : input.values.occurredAt === null
                ? null
                : new Date(input.values.occurredAt),
        },
        context.actor.id,
        changedFields.join(","),
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Incident not found.",
        });
      }

      return serializeIncidentDetail(await requireIncident(input.incidentId));
    }),
};
