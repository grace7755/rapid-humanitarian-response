import { listEvidenceForIncident } from "@my-better-t-app/db/queries/evidence";
import { getIncidentForObserver } from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
} from "../../domain/incidents/constants.js";
import { observerProcedure } from "../../index.js";

const evidenceRecordSchema = z
  .object({
    createdAt: z.string(),
    createdByAgentRunId: z.uuid().nullable(),
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

export const evidenceObserverRouter = {
  list: observerProcedure
    .input(z.object({ incidentId: z.uuid() }).strict())
    .output(z.array(evidenceRecordSchema))
    .handler(async ({ input }) => {
      if (!(await getIncidentForObserver(input.incidentId))) {
        throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
      }
      return (await listEvidenceForIncident(input.incidentId)).map((record) =>
        evidenceRecordSchema.parse({
          ...record,
          createdAt: record.createdAt.toISOString(),
          createdByAgentRunId: record.createdByAgentRunId ?? null,
          publishedAt: record.publishedAt?.toISOString() ?? null,
        }),
      );
    }),
};
