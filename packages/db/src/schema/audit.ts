import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";
import { incidents } from "./incidents.js";

export type AuditMetadata = Record<
  string,
  boolean | number | string | number[] | null
>;

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id").references(() => incidents.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata")
      .$type<AuditMetadata>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_incident_created_at_idx").on(
      table.incidentId,
      table.createdAt,
    ),
    check(
      "audit_events_event_type_check",
      sql`${table.eventType} in ('report.created', 'extraction.started', 'extraction.completed', 'extraction.failed', 'evidence.added', 'verification.completed', 'verification.expired', 'scores.calculated', 'matches.generated', 'partner_notification.sent', 'partner_notification.delivered', 'partner_notification.failed', 'incident.state_changed', 'legacy.human_action')`,
    ),
    check(
      "audit_events_metadata_object_check",
      sql`jsonb_typeof(${table.metadata}) = 'object'`,
    ),
  ],
);

export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;
