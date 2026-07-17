import { z } from "zod";

import {
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  PILOT_COUNTRY,
  PILOT_DISTRICTS,
  PILOT_DIVISION,
} from "../incidents/constants";

const publicHttpUrlSchema = z
  .url("Enter a valid public URL.")
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Only HTTP and HTTPS URLs are allowed.");

export const publicReportInputSchema = z
  .object({
    affectedEstimate: z
      .number()
      .int()
      .nonnegative()
      .max(2_147_483_647)
      .optional(),
    dataNoticeAccepted: z.literal(true, {
      error: "Accept the data notice before submitting.",
    }),
    description: z
      .string()
      .trim()
      .min(40, "Describe the incident in at least 40 characters.")
      .max(2000, "Keep the description to 2,000 characters or fewer."),
    district: z.enum(PILOT_DISTRICTS),
    incidentType: z.enum(INCIDENT_TYPES),
    locationDescription: z.string().trim().min(3).max(200),
    needs: z
      .array(z.enum(INCIDENT_NEEDS))
      .min(1, "Select at least one reported need.")
      .max(INCIDENT_NEEDS.length)
      .refine((values) => new Set(values).size === values.length, {
        message: "Reported needs cannot contain duplicates.",
      }),
    sourceUrl: publicHttpUrlSchema.optional(),
    timeDescription: z.string().trim().min(2).max(200),
    turnstileToken: z.string().trim().min(1).max(2048),
    website: z.string().max(0, "Submission could not be accepted.").default(""),
  })
  .strict();

export const rawReportSnapshotSchema = z
  .object({
    affectedEstimate: z.number().int().nonnegative().optional(),
    country: z.literal(PILOT_COUNTRY),
    description: z.string(),
    district: z.enum(PILOT_DISTRICTS),
    division: z.literal(PILOT_DIVISION),
    incidentType: z.enum(INCIDENT_TYPES),
    locationDescription: z.string(),
    needs: z.array(z.enum(INCIDENT_NEEDS)),
    sourceUrl: publicHttpUrlSchema.optional(),
    timeDescription: z.string(),
  })
  .strict();

export const publicReportOutputSchema = z
  .object({
    reference: z.string().regex(/^RHR-[A-F0-9]{32}$/),
    status: z.literal("received"),
  })
  .strict();

export type PublicReportInput = z.infer<typeof publicReportInputSchema>;
export type PublicReportOutput = z.infer<typeof publicReportOutputSchema>;
