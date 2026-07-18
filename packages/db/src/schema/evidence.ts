import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth.js";
import { incidents } from "./incidents.js";

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sourceName: text("source_name").notNull(),
    publisherDomain: text("publisher_domain").notNull(),
    sourceCategory: text("source_category").notNull(),
    relationship: text("relationship").notNull(),
    isIndependent: boolean("is_independent").default(false).notNull(),
    note: text("note"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("evidence_incident_id_idx").on(table.incidentId),
    check(
      "evidence_source_category_check",
      sql`${table.sourceCategory} in ('official_authority', 'established_humanitarian', 'established_news', 'local_news', 'community_eyewitness', 'unknown')`,
    ),
    check(
      "evidence_relationship_check",
      sql`${table.relationship} in ('supports', 'contradicts', 'context')`,
    ),
    check(
      "evidence_note_length_check",
      sql`${table.note} is null or char_length(${table.note}) <= 500`,
    ),
  ],
);

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
