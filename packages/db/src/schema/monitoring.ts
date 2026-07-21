import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { incidents } from "./incidents.js";

export const monitoringSources = pgTable(
  "monitoring_sources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    connectorType: text("connector_type").notNull(),
    endpoint: text("endpoint").notNull(),
    trustTier: text("trust_tier").notNull(),
    enabled: boolean("enabled").default(false).notNull(),
    cursor: text("cursor"),
    settings: jsonb("settings")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
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
    index("monitoring_sources_enabled_idx").on(table.enabled),
    check(
      "monitoring_sources_connector_check",
      sql`${table.connectorType} in ('community', 'reliefweb', 'ffwc', 'usgs', 'rss')`,
    ),
    check(
      "monitoring_sources_trust_tier_check",
      sql`${table.trustTier} in ('official', 'humanitarian', 'established_news', 'local_news', 'community')`,
    ),
    check(
      "monitoring_sources_settings_object_check",
      sql`jsonb_typeof(${table.settings}) = 'object'`,
    ),
  ],
);

export const sourceObservations = pgTable(
  "source_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => monitoringSources.id),
    incidentId: uuid("incident_id").references(() => incidents.id, {
      onDelete: "set null",
    }),
    externalId: text("external_id"),
    canonicalUrl: text("canonical_url"),
    contentHash: text("content_hash").notNull(),
    title: text("title"),
    excerpt: text("excerpt"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    country: text("country").default("Bangladesh").notNull(),
    division: text("division"),
    district: text("district"),
    incidentTypeCandidate: text("incident_type_candidate"),
    restrictedPayload: jsonb("restricted_payload")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("source_observations_source_external_unique").on(
      table.sourceId,
      table.externalId,
    ),
    unique("source_observations_source_hash_unique").on(
      table.sourceId,
      table.contentHash,
    ),
    index("source_observations_incident_idx").on(table.incidentId),
    index("source_observations_observed_idx").on(table.observedAt),
    check(
      "source_observations_country_check",
      sql`${table.country} = 'Bangladesh'`,
    ),
    check(
      "source_observations_payload_object_check",
      sql`jsonb_typeof(${table.restrictedPayload}) = 'object'`,
    ),
  ],
);

export type MonitoringSource = typeof monitoringSources.$inferSelect;
export type NewMonitoringSource = typeof monitoringSources.$inferInsert;
export type SourceObservation = typeof sourceObservations.$inferSelect;
export type NewSourceObservation = typeof sourceObservations.$inferInsert;
