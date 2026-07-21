import { and, eq, sql } from "drizzle-orm";

import { db } from "../index.js";
import { contactAttempts, incidents, organizations } from "../schema/index.js";

export async function createApprovedContactAttempt(input: {
  approvedByUserId: string;
  channel: "email" | "manual_phone" | "voice";
  escalationTier: number;
  idempotencyKey: string;
  incidentId: string;
  organizationId?: string | null;
}) {
  const [created] = await db
    .insert(contactAttempts)
    .values({
      ...input,
      escalationTier: String(input.escalationTier),
      organizationId: input.organizationId ?? null,
    })
    .onConflictDoNothing({ target: contactAttempts.idempotencyKey })
    .returning();
  return created ?? null;
}

export async function getContactApprovalContext(
  incidentId: string,
  organizationId: string,
) {
  const [record] = await db
    .select({
      automationAllowed: organizations.automationAllowed,
      district: incidents.district,
      factsApproved: incidents.factsApproved,
      organizationId: organizations.id,
      phoneNumber: organizations.phoneNumber,
      reviewStatus: organizations.reviewStatus,
      state: incidents.state,
      tier: organizations.escalationTier,
      verificationStatus: incidents.verificationStatus,
    })
    .from(incidents)
    .innerJoin(organizations, eq(organizations.id, organizationId))
    .where(
      and(eq(incidents.id, incidentId), eq(organizations.id, organizationId)),
    )
    .limit(1);
  return record ?? null;
}

export async function getVoiceAttemptContext(contactAttemptId: string) {
  const [record] = await db
    .select({
      attemptId: contactAttempts.id,
      automationAllowed: organizations.automationAllowed,
      channel: contactAttempts.channel,
      district: incidents.district,
      factsApproved: incidents.factsApproved,
      incidentType: incidents.incidentType,
      phoneNumber: organizations.phoneNumber,
      providerCallId: contactAttempts.providerCallId,
      reviewStatus: organizations.reviewStatus,
      status: contactAttempts.status,
      summary: incidents.summary,
      tier: organizations.escalationTier,
      verificationStatus: incidents.verificationStatus,
    })
    .from(contactAttempts)
    .innerJoin(incidents, eq(contactAttempts.incidentId, incidents.id))
    .innerJoin(
      organizations,
      eq(contactAttempts.organizationId, organizations.id),
    )
    .where(eq(contactAttempts.id, contactAttemptId))
    .limit(1);
  return record ?? null;
}

export async function claimApprovedVoiceAttempt(
  contactAttemptId: string,
  pilotDistricts: string[],
) {
  type ClaimedVoiceAttempt = {
    attempt_id: string;
    automation_allowed: boolean;
    channel: string;
    district: string | null;
    facts_approved: boolean;
    incident_type: string | null;
    phone_number: string | null;
    review_status: string;
    status: string;
    summary: string | null;
    tier: number;
    verification_status: string;
  };
  const result = await db.execute(sql<ClaimedVoiceAttempt>`
    update contact_attempts as attempt
    set status = 'queued'
    from incidents as incident, organizations as organization
    where attempt.id = ${contactAttemptId}::uuid
      and attempt.incident_id = incident.id
      and attempt.organization_id = organization.id
      and attempt.status = 'approved'
      and attempt.channel = 'voice'
      and incident.facts_approved = true
      and incident.verification_status = 'operator_approved'
      and incident.district in (
        select jsonb_array_elements_text(${JSON.stringify(pilotDistricts)}::jsonb)
      )
      and organization.review_status = 'reviewed'
      and organization.automation_allowed = true
      and organization.phone_number is not null
      and organization.escalation_tier <> 1
    returning
      attempt.id as attempt_id,
      organization.automation_allowed,
      attempt.channel,
      incident.district,
      incident.facts_approved,
      incident.incident_type,
      organization.phone_number,
      organization.review_status,
      attempt.status,
      incident.summary,
      organization.escalation_tier as tier,
      incident.verification_status
  `);
  const [record] = result.rows as ClaimedVoiceAttempt[];
  if (!record?.phone_number) return null;
  return {
    attemptId: record.attempt_id,
    automationAllowed: record.automation_allowed,
    channel: record.channel,
    district: record.district,
    factsApproved: record.facts_approved,
    incidentType: record.incident_type,
    phoneNumber: record.phone_number,
    reviewStatus: record.review_status,
    status: record.status,
    summary: record.summary,
    tier: record.tier,
    verificationStatus: record.verification_status,
  };
}

export async function markContactAttemptStarted(
  contactAttemptId: string,
  providerCallId: string,
  providerStatus: string,
) {
  const [updated] = await db
    .update(contactAttempts)
    .set({
      outcome: { providerStatus },
      provider: "vapi",
      providerCallId,
      startedAt: new Date(),
      status: "in_progress",
    })
    .where(
      and(
        eq(contactAttempts.id, contactAttemptId),
        eq(contactAttempts.status, "queued"),
      ),
    )
    .returning({
      id: contactAttempts.id,
      providerCallId: contactAttempts.providerCallId,
      status: contactAttempts.status,
    });
  return updated ?? null;
}

export async function markContactAttemptFailed(
  contactAttemptId: string,
  errorCode: string,
) {
  const [updated] = await db
    .update(contactAttempts)
    .set({
      completedAt: new Date(),
      outcome: { errorCode: errorCode.slice(0, 120) },
      status: "failed",
    })
    .where(
      and(
        eq(contactAttempts.id, contactAttemptId),
        eq(contactAttempts.status, "queued"),
      ),
    )
    .returning({ id: contactAttempts.id });
  return updated ?? null;
}

export async function recordContactAttemptOutcome(
  providerCallId: string,
  input: { outcome: Record<string, unknown>; status: "completed" | "failed" },
) {
  const [updated] = await db
    .update(contactAttempts)
    .set({
      completedAt: new Date(),
      outcome: input.outcome,
      status: input.status,
    })
    .where(eq(contactAttempts.providerCallId, providerCallId))
    .returning({ id: contactAttempts.id });
  return updated ?? null;
}
