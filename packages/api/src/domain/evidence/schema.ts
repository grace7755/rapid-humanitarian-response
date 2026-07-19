import { z } from "zod";

import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
} from "../incidents/constants.js";

const httpUrlSchema = z
  .url()
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Evidence URL must use HTTP or HTTPS.");

export const evidenceCreateInputSchema = z
  .object({
    incidentId: z.uuid(),
    isIndependent: z.boolean(),
    note: z.string().trim().max(500).nullable().optional(),
    publishedAt: z.iso.datetime().nullable().optional(),
    relationship: z.enum(EVIDENCE_RELATIONSHIPS),
    sourceCategory: z.enum(EVIDENCE_SOURCE_CATEGORIES),
    sourceName: z.string().trim().min(2).max(160),
    url: httpUrlSchema,
  })
  .strict();

export const evidenceRemoveInputSchema = z
  .object({
    evidenceId: z.uuid(),
    incidentId: z.uuid(),
  })
  .strict();

export type EvidenceCreateInput = z.infer<typeof evidenceCreateInputSchema>;
