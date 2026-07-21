import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";
import { incidents } from "./incidents.js";
import { organizations } from "./organizations.js";

export const contactAttempts = pgTable(
  "contact_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id),
    escalationTier: text("escalation_tier").notNull(),
    channel: text("channel").notNull(),
    status: text("status").default("approved").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    approvedByUserId: text("approved_by_user_id")
      .notNull()
      .references(() => user.id),
    provider: text("provider"),
    providerCallId: text("provider_call_id"),
    outcome: jsonb("outcome")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("contact_attempts_idempotency_uidx").on(table.idempotencyKey),
    index("contact_attempts_incident_created_idx").on(
      table.incidentId,
      table.createdAt,
    ),
    check(
      "contact_attempts_tier_check",
      sql`${table.escalationTier} in ('1', '2', '3', '4', '5', '6', '7', '8')`,
    ),
    check(
      "contact_attempts_channel_check",
      sql`${table.channel} in ('manual_phone', 'email', 'voice')`,
    ),
    check(
      "contact_attempts_status_check",
      sql`${table.status} in ('approved', 'queued', 'in_progress', 'completed', 'failed', 'cancelled')`,
    ),
    check(
      "contact_attempts_outcome_object_check",
      sql`jsonb_typeof(${table.outcome}) = 'object'`,
    ),
  ],
);

export type ContactAttempt = typeof contactAttempts.$inferSelect;
export type NewContactAttempt = typeof contactAttempts.$inferInsert;
