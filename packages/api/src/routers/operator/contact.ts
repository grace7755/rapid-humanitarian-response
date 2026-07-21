import {
  claimApprovedVoiceAttempt,
  createApprovedContactAttempt,
  getContactApprovalContext,
  getVoiceAttemptContext,
  markContactAttemptFailed,
  markContactAttemptStarted,
} from "@my-better-t-app/db/queries/contact-attempts";
import { env } from "@my-better-t-app/env/server";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { safeErrorCode } from "../../agents/errors.js";
import { operatorProcedure } from "../../index.js";
import { VapiVoiceProvider } from "../../services/vapi.js";

const attemptSchema = z
  .object({
    id: z.uuid(),
    providerCallId: z.string().nullable(),
    status: z.string(),
  })
  .strict();

function requirePilotAndApproved(context: {
  automationAllowed: boolean;
  district: string | null;
  factsApproved: boolean;
  phoneNumber: string | null;
  reviewStatus: string;
  tier: number;
  verificationStatus: string;
}) {
  if (
    !context.factsApproved ||
    context.verificationStatus !== "operator_approved"
  ) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "An operator must approve verified incident facts first.",
    });
  }
  if (!context.district || !env.PILOT_DISTRICTS.includes(context.district)) {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "Live response is limited to configured pilot districts.",
    });
  }
  if (context.reviewStatus !== "reviewed") {
    throw new ORPCError("PRECONDITION_FAILED", {
      message: "The organization contact must be reviewed first.",
    });
  }
}

export const contactRouter = {
  approve: operatorProcedure
    .input(
      z
        .object({
          channel: z.enum(["email", "manual_phone", "voice"]),
          incidentId: z.uuid(),
          organizationId: z.uuid(),
        })
        .strict(),
    )
    .output(attemptSchema)
    .handler(async ({ context, input }) => {
      const approval = await getContactApprovalContext(
        input.incidentId,
        input.organizationId,
      );
      if (!approval) throw new ORPCError("NOT_FOUND");
      requirePilotAndApproved(approval);
      if (input.channel === "voice") {
        if (approval.tier === 1) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: "National emergency service calls are manual-only.",
          });
        }
        if (!approval.automationAllowed || !approval.phoneNumber) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message:
              "This organization has not approved automated voice contact.",
          });
        }
      }
      const attempt = await createApprovedContactAttempt({
        approvedByUserId: context.actor.id,
        channel: input.channel,
        escalationTier: approval.tier,
        idempotencyKey: `${input.incidentId}:${input.organizationId}:${input.channel}`,
        incidentId: input.incidentId,
        organizationId: input.organizationId,
      });
      if (!attempt) {
        throw new ORPCError("CONFLICT", {
          message: "This contact attempt was already approved.",
        });
      }
      return attemptSchema.parse({
        id: attempt.id,
        providerCallId: attempt.providerCallId,
        status: attempt.status,
      });
    }),

  startVoice: operatorProcedure
    .input(z.object({ contactAttemptId: z.uuid() }).strict())
    .output(attemptSchema)
    .handler(async ({ input }) => {
      if (!env.LIVE_OUTREACH_ENABLED || !env.VOICE_ENABLED) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "Live voice outreach is disabled.",
        });
      }
      const attempt = await getVoiceAttemptContext(input.contactAttemptId);
      if (!attempt) throw new ORPCError("NOT_FOUND");
      requirePilotAndApproved(attempt);
      if (
        attempt.channel !== "voice" ||
        attempt.status !== "approved" ||
        attempt.tier === 1 ||
        !attempt.automationAllowed ||
        !attempt.phoneNumber
      ) {
        throw new ORPCError("PRECONDITION_FAILED", {
          message: "This call is not approved for automated voice outreach.",
        });
      }
      const claimed = await claimApprovedVoiceAttempt(
        attempt.attemptId,
        env.PILOT_DISTRICTS,
      );
      if (!claimed) {
        throw new ORPCError("CONFLICT", {
          message: "This voice attempt is already running or no longer valid.",
        });
      }
      let call: Awaited<ReturnType<VapiVoiceProvider["startCall"]>>;
      try {
        call = await new VapiVoiceProvider().startCall({
          contactAttemptId: claimed.attemptId,
          firstMessage: `This is a humanitarian coordination call about a verified ${claimed.incidentType ?? "emergency"} incident in ${claimed.district}. ${claimed.summary ?? "Can your team confirm whether assistance is available?"}`,
          phoneNumber: claimed.phoneNumber,
        });
      } catch (error) {
        await markContactAttemptFailed(claimed.attemptId, safeErrorCode(error));
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "The voice provider could not start this call.",
        });
      }
      const updated = await markContactAttemptStarted(
        claimed.attemptId,
        call.providerCallId,
        call.status,
      );
      if (!updated) throw new ORPCError("CONFLICT");
      return attemptSchema.parse(updated);
    }),
};
