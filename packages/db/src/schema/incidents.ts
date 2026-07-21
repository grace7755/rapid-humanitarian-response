import { sql } from "drizzle-orm";
import {
  boolean,
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

import { user } from "./auth.js";
import { administrativeAreas } from "./locations.js";

export type IncidentRiskFlags = {
  accessBlocked: boolean;
  displacement: boolean;
  noFood: boolean;
  noSafeWater: boolean;
  peopleTrapped: boolean;
  urgentMedicalNeed: boolean;
  vulnerableGroupsReported: boolean;
};

export const incidents = pgTable(
  "incidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reference: text("reference").notNull(),
    sourceType: text("source_type").default("community").notNull(),
    origin: text("origin").default("user_report").notNull(),
    sourceUrl: text("source_url"),
    rawReport: text("raw_report").notNull(),
    title: text("title"),
    summary: text("summary"),
    incidentType: text("incident_type"),
    country: text("country").default("Bangladesh").notNull(),
    division: text("division").default("Chattogram").notNull(),
    divisionCode: text("division_code").references(
      () => administrativeAreas.code,
    ),
    district: text("district"),
    districtCode: text("district_code").references(
      () => administrativeAreas.code,
    ),
    locationText: text("location_text"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }),
    occurredAtPrecision: text("occurred_at_precision")
      .default("unknown")
      .notNull(),
    affectedEstimate: integer("affected_estimate"),
    needs: jsonb("needs").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    riskFlags: jsonb("risk_flags")
      .$type<IncidentRiskFlags>()
      .default(
        sql`'{"accessBlocked":false,"displacement":false,"noFood":false,"noSafeWater":false,"peopleTrapped":false,"urgentMedicalNeed":false,"vulnerableGroupsReported":false}'::jsonb`,
      )
      .notNull(),
    unknowns: jsonb("unknowns")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    confidenceScore: integer("confidence_score").default(0).notNull(),
    urgencyScore: integer("urgency_score").default(0).notNull(),
    state: text("state").default("submitted").notNull(),
    verificationStatus: text("verification_status")
      .default("unverified")
      .notNull(),
    priorityLevel: text("priority_level").default("P3").notNull(),
    factsApproved: boolean("facts_approved").default(false).notNull(),
    reviewedByUserId: text("reviewed_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    modelId: text("model_id"),
    extractionStatus: text("extraction_status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("incidents_reference_uidx").on(table.reference),
    index("incidents_state_idx").on(table.state),
    index("incidents_urgency_score_idx").on(table.urgencyScore),
    index("incidents_updated_at_idx").on(table.updatedAt),
    check(
      "incidents_source_type_check",
      sql`${table.sourceType} in ('community', 'manual', 'reliefweb')`,
    ),
    check(
      "incidents_origin_check",
      sql`${table.origin} in ('user_report', 'automatic', 'operator')`,
    ),
    check(
      "incidents_incident_type_check",
      sql`${table.incidentType} is null or ${table.incidentType} in ('flood', 'landslide', 'cyclone', 'fire', 'earthquake', 'displacement', 'food_insecurity', 'water_shortage', 'medical_access', 'other')`,
    ),
    check("incidents_country_check", sql`${table.country} = 'Bangladesh'`),
    check(
      "incidents_occurred_at_precision_check",
      sql`${table.occurredAtPrecision} in ('exact', 'approximate', 'unknown')`,
    ),
    check(
      "incidents_confidence_score_check",
      sql`${table.confidenceScore} between 0 and 100`,
    ),
    check(
      "incidents_urgency_score_check",
      sql`${table.urgencyScore} between 0 and 100`,
    ),
    check(
      "incidents_affected_estimate_check",
      sql`${table.affectedEstimate} is null or ${table.affectedEstimate} >= 0`,
    ),
    check(
      "incidents_state_check",
      sql`${table.state} in ('submitted', 'reviewing', 'corroborated', 'outreach_ready', 'contact_attempted', 'closed', 'rejected')`,
    ),
    check(
      "incidents_verification_status_check",
      sql`${table.verificationStatus} in ('unverified', 'agent_review', 'agent_corroborated', 'operator_approved', 'contradicted', 'rejected')`,
    ),
    check(
      "incidents_priority_level_check",
      sql`${table.priorityLevel} in ('P0', 'P1', 'P2', 'P3')`,
    ),
    check(
      "incidents_extraction_status_check",
      sql`${table.extractionStatus} in ('pending', 'complete', 'failed')`,
    ),
    check(
      "incidents_needs_array_check",
      sql`jsonb_typeof(${table.needs}) = 'array' and ${table.needs} <@ '["rescue","shelter","food","water","medical","sanitation","protection","transport","information","other"]'::jsonb and jsonb_array_length(${table.needs}) <= 10`,
    ),
    check(
      "incidents_risk_flags_object_check",
      sql`jsonb_typeof(${table.riskFlags}) = 'object' and ${table.riskFlags} ?& array['peopleTrapped', 'noSafeWater', 'noFood', 'urgentMedicalNeed', 'displacement', 'vulnerableGroupsReported', 'accessBlocked'] and ${table.riskFlags} - array['peopleTrapped', 'noSafeWater', 'noFood', 'urgentMedicalNeed', 'displacement', 'vulnerableGroupsReported', 'accessBlocked'] = '{}'::jsonb and jsonb_typeof(${table.riskFlags}->'peopleTrapped') = 'boolean' and jsonb_typeof(${table.riskFlags}->'noSafeWater') = 'boolean' and jsonb_typeof(${table.riskFlags}->'noFood') = 'boolean' and jsonb_typeof(${table.riskFlags}->'urgentMedicalNeed') = 'boolean' and jsonb_typeof(${table.riskFlags}->'displacement') = 'boolean' and jsonb_typeof(${table.riskFlags}->'vulnerableGroupsReported') = 'boolean' and jsonb_typeof(${table.riskFlags}->'accessBlocked') = 'boolean'`,
    ),
    check(
      "incidents_unknowns_array_check",
      sql`jsonb_typeof(${table.unknowns}) = 'array' and jsonb_array_length(${table.unknowns}) <= 10 and not jsonb_path_exists(${table.unknowns}, '$[*] ? (@.type() != "string")')`,
    ),
  ],
);

export type Incident = typeof incidents.$inferSelect;
export type NewIncident = typeof incidents.$inferInsert;
