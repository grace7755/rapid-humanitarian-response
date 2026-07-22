import { listOrganizations } from "@my-better-t-app/db/queries/organizations";
import { z } from "zod";

import {
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
  ORGANIZATION_TYPES,
} from "../../domain/incidents/constants.js";
import { observerProcedure } from "../../index.js";

const organizationSchema = z
  .object({
    areasServed: z.array(z.string()),
    automationAllowed: z.boolean(),
    contactEmail: z.email().nullable(),
    country: z.string(),
    escalationTier: z.number().int().min(1).max(8),
    id: z.uuid(),
    isDemo: z.boolean(),
    lastReviewedAt: z.string().nullable(),
    name: z.string(),
    operatingNotes: z.string().nullable(),
    organizationType: z.enum(ORGANIZATION_TYPES),
    phoneNumber: z.string().nullable(),
    reviewSources: z.array(z.url()),
    reviewStatus: z.enum(ORGANIZATION_REVIEW_STATUSES),
    sectors: z.array(z.enum(ORGANIZATION_SECTORS)),
    updatedAt: z.string(),
    website: z.url(),
  })
  .strict();

export const organizationObserverRouter = {
  list: observerProcedure
    .input(z.object({}).strict().default({}))
    .output(z.array(organizationSchema))
    .handler(async () =>
      (await listOrganizations()).map((organization) =>
        organizationSchema.parse({
          ...organization,
          lastReviewedAt: organization.lastReviewedAt?.toISOString() ?? null,
          updatedAt: organization.updatedAt.toISOString(),
        }),
      ),
    ),
};
