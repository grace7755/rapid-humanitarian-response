import { env } from "@my-better-t-app/env/server";
import { z } from "zod";

export type PartnerAlert = {
  confidenceScore: number;
  district: string;
  incidentType: string;
  locationText: string | null;
  needs: string[];
  organizationName: string;
  priorityLevel: string;
  recipientEmail: string;
  reference: string;
  summary: string | null;
};

export interface PartnerEmailProvider {
  send(
    input: PartnerAlert & { idempotencyKey: string },
  ): Promise<{ messageId: string }>;
}

const resendResponseSchema = z.object({ id: z.string().min(1) }).strict();

function alertText(input: PartnerAlert) {
  return [
    `Autonomously verified humanitarian incident ${input.reference}`,
    "",
    `Organization: ${input.organizationName}`,
    `Incident: ${input.incidentType}`,
    `District: ${input.district}`,
    ...(input.locationText
      ? [`Approximate location: ${input.locationText}`]
      : []),
    `Priority: ${input.priorityLevel}`,
    `Confidence: ${input.confidenceScore}/100`,
    `Reported needs: ${input.needs.length > 0 ? input.needs.join(", ") : "not specified"}`,
    ...(input.summary ? ["", input.summary] : []),
    "",
    "This is an NGO coordination alert, not a government dispatch. For immediate police, fire, or ambulance assistance in Bangladesh, call 999.",
  ].join("\n");
}

export class ResendPartnerEmailProvider implements PartnerEmailProvider {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async send(input: PartnerAlert & { idempotencyKey: string }) {
    if (!env.RESEND_API_KEY || !env.PARTNER_ALERT_FROM) {
      throw new Error("PARTNER_EMAIL_NOT_CONFIGURED");
    }
    const response = await this.fetchImplementation(
      "https://api.resend.com/emails",
      {
        body: JSON.stringify({
          from: env.PARTNER_ALERT_FROM,
          subject: `[${input.priorityLevel}] Verified ${input.incidentType} incident in ${input.district}`,
          text: alertText(input),
          to: [input.recipientEmail],
        }),
        headers: {
          authorization: `Bearer ${env.RESEND_API_KEY}`,
          "content-type": "application/json",
          "idempotency-key": input.idempotencyKey,
        },
        method: "POST",
        signal: AbortSignal.timeout(15_000),
      },
    );
    if (!response.ok) throw new Error("PARTNER_EMAIL_PROVIDER_ERROR");
    const parsed = resendResponseSchema.parse(await response.json());
    return { messageId: parsed.id };
  }
}

export function partnerAlertTextForTest(input: PartnerAlert) {
  return alertText(input);
}
