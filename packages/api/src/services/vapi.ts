import { env } from "@my-better-t-app/env/server";
import { z } from "zod";

import type {
  ApprovedCallRequest,
  VoiceProvider,
} from "../agents/contracts.js";

const vapiCallSchema = z.object({ id: z.string(), status: z.string() });

const COMPLETED_END_REASONS = new Set([
  "assistant-ended-call",
  "assistant-ended-call-after-message-spoken",
  "assistant-ended-call-with-hangup-task",
  "assistant-forwarded-call",
  "assistant-said-end-call-phrase",
  "customer-ended-call",
  "exceeded-max-duration",
  "hangup",
  "manually-canceled",
  "silence-timed-out",
  "voicemail",
  "vonage-completed",
]);

export function contactOutcomeStatus(
  endedReason: string | null | undefined,
): "completed" | "failed" {
  return endedReason && COMPLETED_END_REASONS.has(endedReason)
    ? "completed"
    : "failed";
}

export class VapiVoiceProvider implements VoiceProvider {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async startCall(request: ApprovedCallRequest) {
    if (!env.VOICE_ENABLED || !env.VAPI_API_KEY || !env.VAPI_PHONE_NUMBER_ID) {
      throw new Error("VOICE_NOT_CONFIGURED");
    }

    const response = await this.fetchImplementation(
      "https://api.vapi.ai/call",
      {
        body: JSON.stringify({
          assistant: {
            firstMessage: request.firstMessage,
            model: {
              messages: [
                {
                  content:
                    "You are a humanitarian coordination assistant. Confirm receipt, ask for a human callback contact, do not make promises, and do not request sensitive personal data.",
                  role: "system",
                },
              ],
              model: "gpt-4o-mini",
              provider: "openai",
            },
          },
          customer: { number: request.phoneNumber },
          metadata: { contactAttemptId: request.contactAttemptId },
          phoneNumberId: env.VAPI_PHONE_NUMBER_ID,
        }),
        headers: {
          authorization: `Bearer ${env.VAPI_API_KEY}`,
          "content-type": "application/json",
        },
        method: "POST",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error("VOICE_PROVIDER_ERROR");
    const call = vapiCallSchema.parse(await response.json());
    return { providerCallId: call.id, status: call.status };
  }
}
