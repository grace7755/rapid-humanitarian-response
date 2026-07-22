import { listPartnerNotifications } from "@my-better-t-app/db/queries/notifications";
import { z } from "zod";

import { observerProcedure } from "../../index.js";

const notificationSchema = z
  .object({
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    id: z.uuid(),
    organizationId: z.uuid(),
    providerMessageId: z.string().nullable(),
    recipientEmail: z.string(),
    sentAt: z.string().nullable(),
    status: z.string(),
    verificationRevision: z.number().int(),
  })
  .strict();

export const notificationObserverRouter = {
  list: observerProcedure
    .input(z.object({ incidentId: z.uuid() }).strict())
    .output(z.array(notificationSchema))
    .handler(async ({ input }) =>
      (await listPartnerNotifications(input.incidentId)).map((item) =>
        notificationSchema.parse({
          completedAt: item.completedAt?.toISOString() ?? null,
          createdAt: item.createdAt.toISOString(),
          id: item.id,
          organizationId: item.organizationId,
          providerMessageId: item.providerMessageId,
          recipientEmail: item.recipientEmail,
          sentAt: item.sentAt?.toISOString() ?? null,
          status: item.status,
          verificationRevision: item.verificationRevision,
        }),
      ),
    ),
};
