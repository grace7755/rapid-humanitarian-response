import { z } from "zod";

import {
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
  PILOT_DISTRICTS,
  RISK_FLAG_KEYS,
} from "./constants.js";

export const riskFlagsSchema = z
  .object(
    Object.fromEntries(
      RISK_FLAG_KEYS.map((key) => [key, z.boolean()]),
    ) as Record<(typeof RISK_FLAG_KEYS)[number], z.ZodBoolean>,
  )
  .strict();

export const reviewFieldsSchema = z
  .object({
    affectedEstimate: z
      .number()
      .int()
      .nonnegative()
      .max(2_147_483_647)
      .nullable()
      .optional(),
    district: z.enum(PILOT_DISTRICTS).nullable().optional(),
    incidentType: z.enum(INCIDENT_TYPES).nullable().optional(),
    locationText: z.string().trim().min(3).max(200).nullable().optional(),
    needs: z
      .array(z.enum(INCIDENT_NEEDS))
      .max(INCIDENT_NEEDS.length)
      .refine((values) => new Set(values).size === values.length, {
        message: "Reviewed needs cannot contain duplicates.",
      })
      .optional(),
    occurredAt: z.iso.datetime().nullable().optional(),
    occurredAtPrecision: z.enum(OCCURRENCE_PRECISIONS).optional(),
    riskFlags: riskFlagsSchema.optional(),
    summary: z.string().trim().min(20).max(1200).nullable().optional(),
    title: z.string().trim().min(5).max(160).nullable().optional(),
    unknowns: z
      .array(z.string().trim().min(1).max(200))
      .max(10)
      .refine((values) => new Set(values).size === values.length, {
        message: "Unknowns cannot contain duplicates.",
      })
      .optional(),
  })
  .strict()
  .refine((values) => Object.keys(values).length > 0, {
    message: "Provide at least one reviewed field.",
  });

export type ReviewFields = z.infer<typeof reviewFieldsSchema>;

type ReviewComparableIncident = {
  affectedEstimate: number | null;
  district: string | null;
  incidentType: string | null;
  locationText: string | null;
  needs: readonly string[];
  occurredAt: Date | null;
  occurredAtPrecision: string;
  riskFlags: z.infer<typeof riskFlagsSchema>;
  summary: string | null;
  title: string | null;
  unknowns: string[];
};

export function getChangedReviewFields(
  current: ReviewComparableIncident,
  values: ReviewFields,
) {
  const comparableCurrent = {
    affectedEstimate: current.affectedEstimate,
    district: current.district,
    incidentType: current.incidentType,
    locationText: current.locationText,
    needs: current.needs,
    occurredAt: current.occurredAt?.toISOString() ?? null,
    occurredAtPrecision: current.occurredAtPrecision,
    riskFlags: current.riskFlags,
    summary: current.summary,
    title: current.title,
    unknowns: current.unknowns,
  } satisfies Record<keyof ReviewFields, unknown>;

  return (Object.keys(values) as Array<keyof ReviewFields>)
    .filter(
      (field) =>
        JSON.stringify(comparableCurrent[field]) !==
        JSON.stringify(values[field]),
    )
    .sort();
}
