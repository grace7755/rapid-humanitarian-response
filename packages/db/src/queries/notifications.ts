import { and, desc, eq } from "drizzle-orm";

import { db } from "../index.js";
import {
  incidentMatches,
  incidents,
  notificationWebhookEvents,
  organizations,
  partnerNotifications,
} from "../schema/index.js";

export async function getPartnerNotificationContext(input: {
  incidentId: string;
  organizationId: string;
  revision: number;
}) {
  const [record] = await db
    .select({
      automationAllowed: organizations.automationAllowed,
      confidenceScore: incidents.confidenceScore,
      district: incidents.district,
      incidentType: incidents.incidentType,
      locationText: incidents.locationText,
      needs: incidents.needs,
      organizationName: organizations.name,
      priorityLevel: incidents.priorityLevel,
      recipientEmail: organizations.contactEmail,
      reference: incidents.reference,
      reviewStatus: organizations.reviewStatus,
      revision: incidents.verificationRevision,
      state: incidents.state,
      summary: incidents.summary,
      verificationStatus: incidents.verificationStatus,
    })
    .from(incidentMatches)
    .innerJoin(incidents, eq(incidentMatches.incidentId, incidents.id))
    .innerJoin(
      organizations,
      eq(incidentMatches.organizationId, organizations.id),
    )
    .where(
      and(
        eq(incidentMatches.incidentId, input.incidentId),
        eq(incidentMatches.organizationId, input.organizationId),
        eq(incidents.verificationRevision, input.revision),
      ),
    )
    .limit(1);
  return record ?? null;
}

export async function createPartnerNotification(input: {
  agentRunId: string;
  incidentId: string;
  organizationId: string;
  recipientEmail: string;
  revision: number;
}) {
  const idempotencyKey = `partner-alert/${input.incidentId}/${input.revision}/${input.organizationId}`;
  const [record] = await db
    .insert(partnerNotifications)
    .values({
      agentRunId: input.agentRunId,
      idempotencyKey,
      incidentId: input.incidentId,
      organizationId: input.organizationId,
      recipientEmail: input.recipientEmail,
      verificationRevision: input.revision,
    })
    .onConflictDoNothing({ target: partnerNotifications.idempotencyKey })
    .returning();
  if (record) return { created: true, notification: record };
  const [existing] = await db
    .select()
    .from(partnerNotifications)
    .where(eq(partnerNotifications.idempotencyKey, idempotencyKey))
    .limit(1);
  return existing ? { created: false, notification: existing } : null;
}

export async function markPartnerNotificationSent(
  notificationId: string,
  providerMessageId: string,
) {
  const [updated] = await db
    .update(partnerNotifications)
    .set({ providerMessageId, sentAt: new Date(), status: "sent" })
    .where(
      and(
        eq(partnerNotifications.id, notificationId),
        eq(partnerNotifications.status, "queued"),
      ),
    )
    .returning();
  if (updated) {
    await db
      .update(incidents)
      .set({ state: "notified", updatedAt: new Date() })
      .where(eq(incidents.id, updated.incidentId));
  }
  return updated ?? null;
}

export async function recordPartnerNotificationEvent(input: {
  outcome: Record<string, unknown>;
  providerMessageId: string;
  status: "bounced" | "delayed" | "delivered" | "failed";
}) {
  const [updated] = await db
    .update(partnerNotifications)
    .set({
      completedAt:
        input.status === "delivered" ||
        input.status === "bounced" ||
        input.status === "failed"
          ? new Date()
          : null,
      outcome: input.outcome,
      status: input.status,
    })
    .where(eq(partnerNotifications.providerMessageId, input.providerMessageId))
    .returning({ id: partnerNotifications.id });
  return updated ?? null;
}

export async function listPartnerNotifications(incidentId: string) {
  return db
    .select()
    .from(partnerNotifications)
    .where(eq(partnerNotifications.incidentId, incidentId))
    .orderBy(desc(partnerNotifications.createdAt));
}

export async function claimNotificationWebhookEvent(
  id: string,
  eventType: string,
) {
  const [created] = await db
    .insert(notificationWebhookEvents)
    .values({ eventType, id })
    .onConflictDoNothing({ target: notificationWebhookEvents.id })
    .returning({ id: notificationWebhookEvents.id });
  return Boolean(created);
}
