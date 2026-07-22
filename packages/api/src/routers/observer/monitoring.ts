import { listMonitoringSources } from "@my-better-t-app/db/queries/monitoring";
import { listRecentAgentRuns } from "@my-better-t-app/db/queries/workflows";
import { z } from "zod";

import { observerProcedure } from "../../index.js";

const sourceSchema = z
  .object({
    connectorType: z.string(),
    enabled: z.boolean(),
    endpoint: z.string(),
    id: z.uuid(),
    key: z.string(),
    lastErrorCode: z.string().nullable(),
    lastPolledAt: z.string().nullable(),
    lastSuccessAt: z.string().nullable(),
    name: z.string(),
    trustTier: z.string(),
  })
  .strict();
const agentRunSchema = z
  .object({
    agentName: z.string(),
    errorCode: z.string().nullable(),
    finishedAt: z.string().nullable(),
    id: z.uuid(),
    incidentId: z.uuid().nullable(),
    jobId: z.uuid().nullable(),
    startedAt: z.string(),
    status: z.string(),
  })
  .strict();

export const monitoringObserverRouter = {
  listAgentRuns: observerProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(100).default(50) })
        .strict(),
    )
    .output(z.array(agentRunSchema))
    .handler(async ({ input }) =>
      (await listRecentAgentRuns(input.limit)).map((run) =>
        agentRunSchema.parse({
          ...run,
          finishedAt: run.finishedAt?.toISOString() ?? null,
          startedAt: run.startedAt.toISOString(),
        }),
      ),
    ),
  listSources: observerProcedure
    .output(z.array(sourceSchema))
    .handler(async () =>
      (await listMonitoringSources()).map((source) =>
        sourceSchema.parse({
          ...source,
          lastPolledAt: source.lastPolledAt?.toISOString() ?? null,
          lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
        }),
      ),
    ),
};
