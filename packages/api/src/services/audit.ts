import { z } from "zod";

import {
  AUDIT_EVENT_NAMES,
  CASE_STATES,
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
} from "../domain/incidents/constants.js";

export const auditMetadataSchema = z
  .object({
    evidenceId: z.uuid().optional(),
    organizationId: z.uuid().optional(),
    matchCount: z.number().int().nonnegative().optional(),
    matchScores: z.array(z.number().int().min(0).max(100)).max(3).optional(),
    confidenceScore: z.number().int().min(0).max(100).optional(),
    urgencyScore: z.number().int().min(0).max(100).optional(),
    relationship: z.enum(EVIDENCE_RELATIONSHIPS).optional(),
    sourceCategory: z.enum(EVIDENCE_SOURCE_CATEGORIES).optional(),
    oldState: z.enum(CASE_STATES).optional(),
    newState: z.enum(CASE_STATES).optional(),
  })
  .strict();

export const auditRecordSchema = z.object({
  actorUserId: z.string().min(1).nullable().optional(),
  eventType: z.enum(AUDIT_EVENT_NAMES),
  incidentId: z.uuid().nullable().optional(),
  metadata: auditMetadataSchema.default({}),
});
