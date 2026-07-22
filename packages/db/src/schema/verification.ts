import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { incidents } from "./incidents.js";
import { agentRuns } from "./workflows.js";

export const verificationVerdicts = pgTable(
  "verification_verdicts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    incidentId: uuid("incident_id")
      .notNull()
      .references(() => incidents.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    agentRunId: uuid("agent_run_id")
      .notNull()
      .references(() => agentRuns.id, { onDelete: "cascade" }),
    verifierRole: text("verifier_role").notNull(),
    verdict: text("verdict").notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    sourceDomains: jsonb("source_domains")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    sourceFamilies: jsonb("source_families")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    evidenceIds: jsonb("evidence_ids")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    reasonCodes: jsonb("reason_codes")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("verification_verdicts_incident_revision_role_unique").on(
      table.incidentId,
      table.revision,
      table.verifierRole,
    ),
    index("verification_verdicts_incident_revision_idx").on(
      table.incidentId,
      table.revision,
    ),
    check(
      "verification_verdicts_role_check",
      sql`${table.verifierRole} in ('official_sources', 'humanitarian_news', 'contradiction')`,
    ),
    check(
      "verification_verdicts_verdict_check",
      sql`${table.verdict} in ('supports', 'contradicts', 'inconclusive')`,
    ),
    check(
      "verification_verdicts_confidence_check",
      sql`${table.confidenceScore} between 0 and 100`,
    ),
  ],
);

export type VerificationVerdict = typeof verificationVerdicts.$inferSelect;
export type NewVerificationVerdict = typeof verificationVerdicts.$inferInsert;
