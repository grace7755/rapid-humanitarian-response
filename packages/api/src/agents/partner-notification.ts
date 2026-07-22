import {
  createPartnerNotification,
  getPartnerNotificationContext,
  markPartnerNotificationSent,
} from "@my-better-t-app/db/queries/notifications";
import { env } from "@my-better-t-app/env/server";
import { z } from "zod";

import {
  type PartnerEmailProvider,
  ResendPartnerEmailProvider,
} from "../services/partner-email.js";
import type { AgentContext } from "./contracts.js";

const notificationJobSchema = z
  .object({
    incidentId: z.uuid(),
    organizationId: z.uuid(),
    revision: z.number().int().positive(),
  })
  .strict();

export async function runPartnerNotificationAgent(
  context: AgentContext,
  rawInput: Record<string, unknown>,
  provider: PartnerEmailProvider = new ResendPartnerEmailProvider(),
) {
  const input = notificationJobSchema.parse(rawInput);
  if (!env.AUTONOMOUS_ESCALATION_ENABLED || !env.PARTNER_EMAIL_ENABLED) {
    throw new Error("AUTONOMOUS_PARTNER_EMAIL_DISABLED");
  }
  const notificationContext = await getPartnerNotificationContext(input);
  if (!notificationContext)
    throw new Error("PARTNER_NOTIFICATION_CONTEXT_NOT_FOUND");
  if (
    notificationContext.revision !== input.revision ||
    notificationContext.verificationStatus !== "corroborated" ||
    !["corroborated", "escalation_ready", "notified"].includes(
      notificationContext.state,
    ) ||
    notificationContext.reviewStatus !== "reviewed" ||
    !notificationContext.automationAllowed ||
    !notificationContext.recipientEmail ||
    !notificationContext.district ||
    !notificationContext.incidentType
  ) {
    throw new Error("PARTNER_NOTIFICATION_GATE_BLOCKED");
  }
  const created = await createPartnerNotification({
    agentRunId: context.runId,
    incidentId: input.incidentId,
    organizationId: input.organizationId,
    recipientEmail: notificationContext.recipientEmail,
    revision: input.revision,
  });
  if (!created) throw new Error("PARTNER_NOTIFICATION_CREATE_FAILED");
  if (!created.created) {
    return {
      notificationId: created.notification.id,
      skipped: true,
      status: created.notification.status,
    };
  }
  const sent = await provider.send({
    confidenceScore: notificationContext.confidenceScore,
    district: notificationContext.district,
    idempotencyKey: created.notification.idempotencyKey,
    incidentType: notificationContext.incidentType,
    locationText: notificationContext.locationText,
    needs: notificationContext.needs,
    organizationName: notificationContext.organizationName,
    priorityLevel: notificationContext.priorityLevel,
    recipientEmail: notificationContext.recipientEmail,
    reference: notificationContext.reference,
    summary: notificationContext.summary,
  });
  const updated = await markPartnerNotificationSent(
    created.notification.id,
    sent.messageId,
  );
  if (!updated) throw new Error("PARTNER_NOTIFICATION_STATE_CONFLICT");
  return {
    notificationId: updated.id,
    providerMessageId: sent.messageId,
    skipped: false,
    status: updated.status,
  };
}
