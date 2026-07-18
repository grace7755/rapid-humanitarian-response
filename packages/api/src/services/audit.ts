import { insertAuditEvent } from "@my-better-t-app/db/queries/audit";
import { z } from "zod";

import {
  AUDIT_EVENT_NAMES,
  CASE_STATES,
  OUTREACH_STATUSES,
} from "../domain/incidents/constants.js";

export const auditMetadataSchema = z
  .object({
    evidenceId: z.uuid().optional(),
    organizationId: z.uuid().optional(),
    outreachDraftId: z.uuid().optional(),
    matchCount: z.number().int().nonnegative().optional(),
    confidenceScore: z.number().int().min(0).max(100).optional(),
    urgencyScore: z.number().int().min(0).max(100).optional(),
    oldState: z.enum(CASE_STATES).optional(),
    newState: z.enum(CASE_STATES).optional(),
    oldStatus: z.enum(OUTREACH_STATUSES).optional(),
    newStatus: z.enum(OUTREACH_STATUSES).optional(),
  })
  .strict();

export const auditRecordSchema = z.object({
  actorUserId: z.string().min(1).nullable().optional(),
  eventType: z.enum(AUDIT_EVENT_NAMES),
  incidentId: z.uuid().nullable().optional(),
  metadata: auditMetadataSchema.default({}),
});

export type AuditRecordInput = z.input<typeof auditRecordSchema>;

export async function recordAuditEvent(input: AuditRecordInput) {
  const parsed = auditRecordSchema.parse(input);

  return insertAuditEvent({
    actorUserId: parsed.actorUserId,
    eventType: parsed.eventType,
    incidentId: parsed.incidentId,
    metadata: parsed.metadata,
  });
}
