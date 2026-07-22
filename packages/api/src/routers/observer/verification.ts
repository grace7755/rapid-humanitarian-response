import { listVerificationVerdicts } from "@my-better-t-app/db/queries/verification";
import { z } from "zod";

import { observerProcedure } from "../../index.js";

const verdictSchema = z
  .object({
    agentRunId: z.uuid(),
    confidenceScore: z.number().int().min(0).max(100),
    createdAt: z.string(),
    evidenceIds: z.array(z.string()),
    id: z.uuid(),
    reasonCodes: z.array(z.string()),
    revision: z.number().int(),
    sourceDomains: z.array(z.string()),
    sourceFamilies: z.array(z.string()),
    verdict: z.string(),
    verifierRole: z.string(),
  })
  .strict();

export const verificationObserverRouter = {
  list: observerProcedure
    .input(
      z
        .object({
          incidentId: z.uuid(),
          revision: z.number().int().nonnegative(),
        })
        .strict(),
    )
    .output(z.array(verdictSchema))
    .handler(async ({ input }) =>
      (await listVerificationVerdicts(input.incidentId, input.revision)).map(
        (item) =>
          verdictSchema.parse({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }),
      ),
    ),
};
