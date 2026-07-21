import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { incidents } from "./incidents.js";

export const workflowJobs = pgTable(
  "workflow_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobType: text("job_type").notNull(),
    status: text("status").default("pending").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    lastErrorCode: text("last_error_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("workflow_jobs_idempotency_uidx").on(table.idempotencyKey),
    index("workflow_jobs_claim_idx").on(
      table.status,
      table.availableAt,
      table.lockedUntil,
    ),
    check(
      "workflow_jobs_status_check",
      sql`${table.status} in ('pending', 'running', 'completed', 'failed', 'dead')`,
    ),
    check(
      "workflow_jobs_attempts_check",
      sql`${table.attemptCount} >= 0 and ${table.maxAttempts} between 1 and 10`,
    ),
  ],
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id").references(() => workflowJobs.id, {
      onDelete: "set null",
    }),
    incidentId: uuid("incident_id").references(() => incidents.id, {
      onDelete: "set null",
    }),
    agentName: text("agent_name").notNull(),
    status: text("status").default("running").notNull(),
    inputSummary: jsonb("input_summary")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    outputSummary: jsonb("output_summary")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    modelProvider: text("model_provider"),
    modelId: text("model_id"),
    errorCode: text("error_code"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("agent_runs_job_idx").on(table.jobId),
    index("agent_runs_incident_started_idx").on(
      table.incidentId,
      table.startedAt,
    ),
    check(
      "agent_runs_name_check",
      sql`${table.agentName} in ('monitoring', 'correlation', 'classification', 'verification', 'priority', 'communication', 'voice', 'ngo_matching', 'reporting')`,
    ),
    check(
      "agent_runs_status_check",
      sql`${table.status} in ('running', 'completed', 'failed')`,
    ),
  ],
);

export type WorkflowJob = typeof workflowJobs.$inferSelect;
export type NewWorkflowJob = typeof workflowJobs.$inferInsert;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
