import { asc, eq } from "drizzle-orm";

import { db } from "../index.js";
import { auditEvents, type NewAuditEvent } from "../schema/index.js";

export type InsertAuditEvent = Omit<NewAuditEvent, "createdAt" | "id">;

export async function insertAuditEvent(input: InsertAuditEvent) {
  const [created] = await db.insert(auditEvents).values(input).returning({
    id: auditEvents.id,
    incidentId: auditEvents.incidentId,
    eventType: auditEvents.eventType,
    createdAt: auditEvents.createdAt,
  });

  return created;
}

export async function listAuditTimeline(incidentId: string) {
  return db
    .select({
      id: auditEvents.id,
      actorUserId: auditEvents.actorUserId,
      eventType: auditEvents.eventType,
      metadata: auditEvents.metadata,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.incidentId, incidentId))
    .orderBy(asc(auditEvents.createdAt));
}
