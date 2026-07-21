import { listOrganizations } from "@my-better-t-app/db/queries/organizations";
import { z } from "zod";

import {
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
  ORGANIZATION_TYPES,
} from "../../domain/incidents/constants.js";
import { operatorProcedure } from "../../index.js";

export const organizationRecordSchema = z
  .object({
    areasServed: z.array(z.string()),
    contactEmail: z.email().nullable(),
    phoneNumber: z.string().nullable(),
    country: z.string(),
    id: z.uuid(),
    isDemo: z.boolean(),
    lastReviewedAt: z.string().nullable(),
    name: z.string(),
    organizationType: z.enum(ORGANIZATION_TYPES),
    escalationTier: z.number().int().min(1).max(8),
    automationAllowed: z.boolean(),
    operatingNotes: z.string().nullable(),
    reviewSources: z.array(z.url()),
    reviewStatus: z.enum(ORGANIZATION_REVIEW_STATUSES),
    sectors: z.array(z.enum(ORGANIZATION_SECTORS)),
    updatedAt: z.string(),
    website: z.url(),
  })
  .strict();

export const organizationsRouter = {
  list: operatorProcedure
    .input(z.object({}).strict().default({}))
    .output(z.array(organizationRecordSchema))
    .handler(async () => {
      const organizations = await listOrganizations();
      return organizations.map((organization) =>
        organizationRecordSchema.parse({
          ...organization,
          lastReviewedAt: organization.lastReviewedAt?.toISOString() ?? null,
          updatedAt: organization.updatedAt.toISOString(),
        }),
      );
    }),
};
