import { sql } from "drizzle-orm";
import {
  boolean,
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
import { sourceObservations } from "./monitoring.js";
import { agentRuns } from "./workflows.js";

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    observationId: uuid("observation_id").references(
      () => sourceObservations.id,
      { onDelete: "set null" },
    ),
    url: text("url").notNull(),
    sourceName: text("source_name").notNull(),
    publisherDomain: text("publisher_domain").notNull(),
    sourceCategory: text("source_category").notNull(),
    relationship: text("relationship").notNull(),
    isIndependent: boolean("is_independent").default(false).notNull(),
    note: text("note"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id),
    createdByAgentRunId: uuid("created_by_agent_run_id").references(
      () => agentRuns.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("evidence_incident_id_idx").on(table.incidentId),
    unique("evidence_incident_observation_unique").on(
      table.incidentId,
      table.observationId,
    ),
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
    check(
      "evidence_actor_check",
      sql`num_nonnulls(${table.createdByUserId}, ${table.createdByAgentRunId}) = 1`,
    ),
  ],
);

export type Evidence = typeof evidence.$inferSelect;
export type NewEvidence = typeof evidence.$inferInsert;
