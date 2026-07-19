import {
  addEvidence,
  listEvidenceForIncident,
  removeEvidence,
} from "@my-better-t-app/db/queries/evidence";
import { getIncidentForOperator } from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  evidenceCreateInputSchema,
  evidenceRemoveInputSchema,
} from "../../domain/evidence/schema.js";
import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
} from "../../domain/incidents/constants.js";
import { operatorProcedure } from "../../index.js";

const evidenceRecordSchema = z
  .object({
    createdAt: z.string(),
    createdByUserId: z.string(),
    id: z.uuid(),
    isIndependent: z.boolean(),
    note: z.string().nullable(),
    publishedAt: z.string().nullable(),
    publisherDomain: z.string(),
    relationship: z.enum(EVIDENCE_RELATIONSHIPS),
    sourceCategory: z.enum(EVIDENCE_SOURCE_CATEGORIES),
    sourceName: z.string(),
    url: z.url(),
  })
  .strict();

async function requireIncident(incidentId: string) {
  const incident = await getIncidentForOperator(incidentId);
  if (!incident) {
    throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
  }
  return incident;
}

async function serializeEvidence(incidentId: string) {
  const records = await listEvidenceForIncident(incidentId);
  return records.map((record) =>
    evidenceRecordSchema.parse({
      ...record,
      createdAt: record.createdAt.toISOString(),
      publishedAt: record.publishedAt?.toISOString() ?? null,
    }),
  );
}

export const evidenceRouter = {
  create: operatorProcedure
    .input(evidenceCreateInputSchema)
    .output(z.array(evidenceRecordSchema))
    .handler(async ({ context, input }) => {
      await requireIncident(input.incidentId);
      await addEvidence({
        createdByUserId: context.actor.id,
        incidentId: input.incidentId,
        isIndependent: input.isIndependent,
        note: input.note || null,
        publishedAt: input.publishedAt ? new Date(input.publishedAt) : null,
        relationship: input.relationship,
        sourceCategory: input.sourceCategory,
        sourceName: input.sourceName,
        url: input.url,
      });
      return serializeEvidence(input.incidentId);
    }),

  list: operatorProcedure
    .input(z.object({ incidentId: z.uuid() }).strict())
    .output(z.array(evidenceRecordSchema))
    .handler(async ({ input }) => {
      await requireIncident(input.incidentId);
      return serializeEvidence(input.incidentId);
    }),

  remove: operatorProcedure
    .input(evidenceRemoveInputSchema)
    .output(z.array(evidenceRecordSchema))
    .handler(async ({ context, input }) => {
      await requireIncident(input.incidentId);
      const removed = await removeEvidence(
        input.evidenceId,
        input.incidentId,
        context.actor.id,
      );
      if (!removed) {
        throw new ORPCError("NOT_FOUND", {
          message: "Evidence record not found for this incident.",
        });
      }
      return serializeEvidence(input.incidentId);
    }),
};
