import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";
import { incidents } from "./incidents.js";
import { organizations } from "./organizations.js";

export const outreachDrafts = pgTable(
  "outreach_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    status: text("status").default("draft").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("outreach_drafts_incident_org_unique").on(
      table.incidentId,
      table.organizationId,
    ),
    index("outreach_drafts_incident_id_idx").on(table.incidentId),
    check(
      "outreach_drafts_status_check",
      sql`${table.status} in ('draft', 'copied', 'mailto_opened', 'contact_attempted')`,
    ),
  ],
);

export type OutreachDraft = typeof outreachDrafts.$inferSelect;
export type NewOutreachDraft = typeof outreachDrafts.$inferInsert;
