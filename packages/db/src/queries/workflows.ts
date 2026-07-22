import { desc, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import {
  agentRuns,
  type NewAgentRun,
  type NewWorkflowJob,
  workflowJobs,
} from "../schema/index.js";

export async function enqueueWorkflowJob(
  input: Omit<
    NewWorkflowJob,
    "attemptCount" | "createdAt" | "id" | "status" | "updatedAt"
  >,
) {
  const [created] = await db
    .insert(workflowJobs)
    .values(input)
    .onConflictDoNothing({ target: workflowJobs.idempotencyKey })
    .returning({ id: workflowJobs.id, status: workflowJobs.status });
  return created ?? null;
}

export async function claimWorkflowJobs(limit = 5, leaseSeconds = 45) {
  const result = await db.execute(sql<{
    attempt_count: number;
    id: string;
    job_type: string;
    max_attempts: number;
    payload: Record<string, unknown>;
  }>`
    with candidates as (
      select id
      from workflow_jobs
      where
        (status = 'pending' or (status = 'running' and locked_until < now()))
        and available_at <= now()
        and attempt_count < max_attempts
      order by available_at, created_at
      for update skip locked
      limit ${Math.max(1, Math.min(limit, 20))}
    )
    update workflow_jobs as job
    set
      status = 'running',
      attempt_count = job.attempt_count + 1,
      locked_until = now() + (${leaseSeconds} * interval '1 second'),
      updated_at = now()
    from candidates
    where job.id = candidates.id
    returning job.id, job.job_type, job.payload, job.attempt_count, job.max_attempts
  `);

  const rows = result.rows as Array<{
    attempt_count: number;
    id: string;
    job_type: string;
    max_attempts: number;
    payload: Record<string, unknown>;
  }>;
  return rows.map((row) => ({
    attemptCount: row.attempt_count,
    id: row.id,
    jobType: row.job_type,
    maxAttempts: row.max_attempts,
    payload: row.payload,
  }));
}

export async function completeWorkflowJob(jobId: string) {
  await db
    .update(workflowJobs)
    .set({ lockedUntil: null, status: "completed", updatedAt: new Date() })
    .where(eq(workflowJobs.id, jobId));
}

export async function failWorkflowJob(
  jobId: string,
  errorCode: string,
  retryDelaySeconds: number,
) {
  const [job] = await db
    .select({
      attemptCount: workflowJobs.attemptCount,
      maxAttempts: workflowJobs.maxAttempts,
    })
    .from(workflowJobs)
    .where(eq(workflowJobs.id, jobId))
    .limit(1);
  if (!job) return;

  const dead = job.attemptCount >= job.maxAttempts;
  await db
    .update(workflowJobs)
    .set({
      availableAt: new Date(Date.now() + retryDelaySeconds * 1000),
      lastErrorCode: errorCode.slice(0, 120),
      lockedUntil: null,
      status: dead ? "dead" : "pending",
      updatedAt: new Date(),
    })
    .where(eq(workflowJobs.id, jobId));
}

export async function createAgentRun(
  input: Omit<NewAgentRun, "finishedAt" | "id" | "startedAt" | "status">,
) {
  const [created] = await db
    .insert(agentRuns)
    .values(input)
    .returning({ id: agentRuns.id });
  return created;
}

export async function finishAgentRun(
  runId: string,
  values: {
    errorCode?: string | null;
    modelId?: string | null;
    modelProvider?: string | null;
    outputSummary?: Record<string, unknown>;
    status: "completed" | "failed";
  },
) {
  await db
    .update(agentRuns)
    .set({
      errorCode: values.errorCode ?? null,
      finishedAt: new Date(),
      modelId: values.modelId,
      modelProvider: values.modelProvider,
      outputSummary: values.outputSummary ?? {},
      status: values.status,
    })
    .where(eq(agentRuns.id, runId));
}

export async function listRecentAgentRuns(limit = 50) {
  return db
    .select()
    .from(agentRuns)
    .orderBy(desc(agentRuns.startedAt))
    .limit(Math.max(1, Math.min(limit, 100)));
}
