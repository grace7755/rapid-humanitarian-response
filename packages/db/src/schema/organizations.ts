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
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    website: text("website").notNull(),
    contactEmail: text("contact_email"),
    phoneNumber: text("phone_number"),
    country: text("country").notNull(),
    areasServed: jsonb("areas_served")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    sectors: jsonb("sectors")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    organizationType: text("organization_type").notNull(),
    escalationTier: integer("escalation_tier").default(6).notNull(),
    automationAllowed: boolean("automation_allowed").default(false).notNull(),
    operatingNotes: text("operating_notes"),
    reviewStatus: text("review_status").default("needs_review").notNull(),
    reviewSources: jsonb("review_sources")
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
    isDemo: boolean("is_demo").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("organizations_review_status_idx").on(table.reviewStatus),
    check(
      "organizations_type_check",
      sql`${table.organizationType} in ('community_group', 'local_ngo', 'national_ngo', 'international_ngo', 'un_agency', 'government', 'other')`,
    ),
    check(
      "organizations_review_status_check",
      sql`${table.reviewStatus} in ('reviewed', 'needs_review', 'do_not_contact')`,
    ),
    check(
      "organizations_escalation_tier_check",
      sql`${table.escalationTier} between 1 and 8`,
    ),
    check(
      "organizations_reviewed_at_check",
      sql`${table.isDemo} or ${table.reviewStatus} <> 'reviewed' or ${table.lastReviewedAt} is not null`,
    ),
    check(
      "organizations_areas_array_check",
      sql`jsonb_typeof(${table.areasServed}) = 'array'`,
    ),
    check(
      "organizations_sectors_array_check",
      sql`jsonb_typeof(${table.sectors}) = 'array' and ${table.sectors} <@ '["search_and_rescue","emergency_response","shelter","camp_management","food_assistance","nutrition","water_sanitation_hygiene","health","emergency_medical_support","protection","logistics","emergency_transport","information_management","community_communication","other"]'::jsonb`,
    ),
    check(
      "organizations_review_sources_array_check",
      sql`jsonb_typeof(${table.reviewSources}) = 'array'`,
    ),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
