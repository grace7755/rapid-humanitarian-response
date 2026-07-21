import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  index,
  pgTable,
  text,
} from "drizzle-orm/pg-core";

export const administrativeAreas = pgTable(
  "administrative_areas",
  {
    code: text("code").primaryKey(),
    name: text("name").notNull(),
    level: text("level").notNull(),
    parentCode: text("parent_code").references(
      (): AnyPgColumn => administrativeAreas.code,
    ),
  },
  (table) => [
    index("administrative_areas_parent_idx").on(table.parentCode),
    check(
      "administrative_areas_level_check",
      sql`${table.level} in ('country', 'division', 'district')`,
    ),
  ],
);

export type AdministrativeArea = typeof administrativeAreas.$inferSelect;
export type NewAdministrativeArea = typeof administrativeAreas.$inferInsert;
