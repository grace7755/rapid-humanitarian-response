import { listEnabledMonitoringSources } from "@my-better-t-app/db/queries/monitoring";
import {
  claimWorkflowJobs,
  completeWorkflowJob,
  createAgentRun,
  enqueueWorkflowJob,
  failWorkflowJob,
  finishAgentRun,
} from "@my-better-t-app/db/queries/workflows";

import type { AgentName } from "./contracts.js";
import { safeErrorCode } from "./errors.js";
import { runNgoMatchingAgent } from "./ngo-matching.js";
import {
  runClassificationAgent,
  runCorrelationAgent,
  runMonitoringAgent,
  runPriorityAgent,
  runVerificationAgent,
} from "./pipeline.js";

const supportedJobs = {
  classification: runClassificationAgent,
  correlation: runCorrelationAgent,
  monitoring: runMonitoringAgent,
  ngo_matching: runNgoMatchingAgent,
  priority: runPriorityAgent,
  verification: runVerificationAgent,
} as const;

function incidentIdFromPayload(payload: Record<string, unknown>) {
  return typeof payload.incidentId === "string" ? payload.incidentId : null;
}

export async function enqueueMonitoringSweep(now = new Date()) {
  const sources = await listEnabledMonitoringSources();
  const fifteenMinuteBucket = Math.floor(now.getTime() / (15 * 60 * 1_000));
  let enqueued = 0;
  for (const source of sources) {
    const created = await enqueueWorkflowJob({
      idempotencyKey: `monitoring:${source.id}:${fifteenMinuteBucket}`,
      jobType: "monitoring",
      payload: { sourceId: source.id },
    });
    if (created) enqueued += 1;
  }
  return { enabledSources: sources.length, enqueued };
}

export async function processWorkflowBatch(
  maxJobs = 50,
  maxRuntimeMs = 50_000,
) {
  let completed = 0;
  let failed = 0;
  let processed = 0;
  const deadline = Date.now() + Math.max(1_000, maxRuntimeMs);

  while (
    processed < Math.max(1, Math.min(maxJobs, 100)) &&
    Date.now() < deadline
  ) {
    const jobs = await claimWorkflowJobs(1, 120);
    if (jobs.length === 0) break;

    for (const job of jobs) {
      processed += 1;
      const handler = supportedJobs[job.jobType as keyof typeof supportedJobs];
      const agentName = job.jobType as AgentName;
      const run = await createAgentRun({
        agentName,
        incidentId: incidentIdFromPayload(job.payload),
        inputSummary: { jobType: job.jobType },
        jobId: job.id,
      });
      if (!run) {
        await failWorkflowJob(job.id, "AGENT_RUN_CREATE_FAILED", 60);
        failed += 1;
        continue;
      }

      try {
        if (!handler) throw new Error("JOB_TYPE_NOT_SUPPORTED");
        const output = await handler(
          { jobId: job.id, runId: run.id },
          job.payload,
        );
        await finishAgentRun(run.id, {
          modelId:
            "modelId" in output && typeof output.modelId === "string"
              ? output.modelId
              : null,
          modelProvider:
            "modelProvider" in output &&
            typeof output.modelProvider === "string"
              ? output.modelProvider
              : null,
          outputSummary: output,
          status: "completed",
        });
        await completeWorkflowJob(job.id);
        completed += 1;
      } catch (error) {
        const errorCode = safeErrorCode(error);
        await finishAgentRun(run.id, { errorCode, status: "failed" });
        await failWorkflowJob(
          job.id,
          errorCode,
          60 * 2 ** (job.attemptCount - 1),
        );
        failed += 1;
      }
    }
  }

  return { completed, failed, processed };
}

export async function runMonitoringCycle() {
  const sweep = await enqueueMonitoringSweep();
  const workflow = await processWorkflowBatch();
  return { sweep, workflow };
}
