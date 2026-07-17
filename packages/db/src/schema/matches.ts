import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { incidents } from "./incidents";
import { organizations } from "./organizations";

export const incidentMatches = pgTable(
  "incident_matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    score: integer("score").notNull(),
    reasons: jsonb("reasons")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("incident_matches_incident_org_unique").on(
      table.incidentId,
      table.organizationId,
    ),
    index("incident_matches_incident_id_idx").on(table.incidentId),
    check(
      "incident_matches_score_check",
      sql`${table.score} between 0 and 100`,
    ),
    check(
      "incident_matches_reasons_array_check",
      sql`jsonb_typeof(${table.reasons}) = 'array'`,
    ),
  ],
);

export type IncidentMatch = typeof incidentMatches.$inferSelect;
export type NewIncidentMatch = typeof incidentMatches.$inferInsert;
