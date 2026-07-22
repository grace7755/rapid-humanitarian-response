import { getIncidentForObserver } from "@my-better-t-app/db/queries/incidents";
import { listIncidentMatches } from "@my-better-t-app/db/queries/matches";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { observerProcedure } from "../../index.js";

const matchRecordSchema = z
  .object({
    contactEmail: z.email().nullable(),
    createdAt: z.string(),
    id: z.uuid(),
    isDemo: z.boolean(),
    organizationId: z.uuid(),
    organizationName: z.string(),
    organizationWebsite: z.url(),
    reasons: z.array(z.string()),
    reviewStatus: z.literal("reviewed"),
    score: z.number().int().min(0).max(100),
  })
  .strict();

export const matchObserverRouter = {
  list: observerProcedure
    .input(z.object({ incidentId: z.uuid() }).strict())
    .output(z.array(matchRecordSchema))
    .handler(async ({ input }) => {
      if (!(await getIncidentForObserver(input.incidentId))) {
        throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
      }
      return (await listIncidentMatches(input.incidentId)).map((match) =>
        matchRecordSchema.parse({
          ...match,
          createdAt: match.createdAt.toISOString(),
        }),
      );
    }),
};
