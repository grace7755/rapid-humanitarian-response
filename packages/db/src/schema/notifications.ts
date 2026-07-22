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
import { organizations } from "./organizations.js";
import { agentRuns } from "./workflows.js";

export const partnerNotifications = pgTable(
  "partner_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    verificationRevision: integer("verification_revision").notNull(),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "restrict" }),
    recipientEmail: text("recipient_email").notNull(),
    status: text("status").default("queued").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    provider: text("provider").default("resend").notNull(),
    providerMessageId: text("provider_message_id"),
    outcome: jsonb("outcome")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("partner_notifications_idempotency_uidx").on(
      table.idempotencyKey,
    ),
    index("partner_notifications_incident_created_idx").on(
      table.incidentId,
      table.createdAt,
    ),
    index("partner_notifications_provider_message_idx").on(
      table.providerMessageId,
    ),
    check(
      "partner_notifications_status_check",
      sql`${table.status} in ('queued', 'sent', 'delivered', 'delayed', 'bounced', 'failed')`,
    ),
  ],
);

export const notificationWebhookEvents = pgTable(
  "notification_webhook_events",
  {
    id: text("id").primaryKey(),
    eventType: text("event_type").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
);

export type PartnerNotification = typeof partnerNotifications.$inferSelect;
export type NewPartnerNotification = typeof partnerNotifications.$inferInsert;
