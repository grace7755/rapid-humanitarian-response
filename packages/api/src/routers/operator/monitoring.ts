import {
  listMonitoringSources,
  setMonitoringSourceEnabled,
} from "@my-better-t-app/db/queries/monitoring";
import { listRecentAgentRuns } from "@my-better-t-app/db/queries/workflows";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { operatorProcedure } from "../../index.js";

const IMPLEMENTED_CONNECTORS = new Set(["reliefweb", "usgs"]);

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

function serializeSource(
  source: Awaited<ReturnType<typeof listMonitoringSources>>[number],
) {
  return sourceSchema.parse({
    connectorType: source.connectorType,
    enabled: source.enabled,
    endpoint: source.endpoint,
    id: source.id,
    key: source.key,
    lastErrorCode: source.lastErrorCode,
    lastPolledAt: source.lastPolledAt?.toISOString() ?? null,
    lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
    name: source.name,
    trustTier: source.trustTier,
  });
}

export const monitoringRouter = {
  listAgentRuns: operatorProcedure
    .input(
      z
        .object({ limit: z.number().int().min(1).max(100).default(50) })
        .strict(),
    )
    .output(z.array(agentRunSchema))
    .handler(async ({ input }) => {
      const runs = await listRecentAgentRuns(input.limit);
      return runs.map((run) =>
        agentRunSchema.parse({
          agentName: run.agentName,
          errorCode: run.errorCode,
          finishedAt: run.finishedAt?.toISOString() ?? null,
          id: run.id,
          incidentId: run.incidentId,
          jobId: run.jobId,
          startedAt: run.startedAt.toISOString(),
          status: run.status,
        }),
      );
    }),

  listSources: operatorProcedure
    .output(z.array(sourceSchema))
    .handler(async () => (await listMonitoringSources()).map(serializeSource)),

  setSourceEnabled: operatorProcedure
    .input(z.object({ enabled: z.boolean(), sourceId: z.uuid() }).strict())
    .output(sourceSchema)
    .handler(async ({ input }) => {
      const current = (await listMonitoringSources()).find(
        (item) => item.id === input.sourceId,
      );
      if (!current) throw new ORPCError("NOT_FOUND");
      if (input.enabled && !IMPLEMENTED_CONNECTORS.has(current.connectorType)) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "This monitoring connector is not implemented yet.",
        });
      }
      const updated = await setMonitoringSourceEnabled(
        input.sourceId,
        input.enabled,
      );
      if (!updated) {
        throw new ORPCError("NOT_FOUND", {
          message: "Monitoring source not found.",
        });
      }
      const source = (await listMonitoringSources()).find(
        (item) => item.id === input.sourceId,
      );
      if (!source) throw new ORPCError("NOT_FOUND");
      return serializeSource(source);
    }),
};
