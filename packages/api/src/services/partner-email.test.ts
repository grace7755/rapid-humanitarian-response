import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@my-better-t-app/env/server", () => ({
  env: {
    PARTNER_ALERT_FROM: "Alerts <alerts@example.org>",
    RESEND_API_KEY: "secret",
  },
}));

import {
  partnerAlertTextForTest,
  ResendPartnerEmailProvider,
} from "./partner-email";

const alert = {
  confidenceScore: 90,
  district: "Feni",
  incidentType: "flood",
  locationText: "Feni Sadar",
  needs: ["water", "shelter"],
  organizationName: "Response Partner",
  priorityLevel: "P1",
  recipientEmail: "response@example.org",
  reference: "RHR-123",
  summary: "Flood water has entered homes.",
};

describe("partner email", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("sends a plain-text, idempotent partner alert", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
      );
    const provider = new ResendPartnerEmailProvider(
      fetchMock as unknown as typeof fetch,
    );

    await expect(
      provider.send({
        ...alert,
        idempotencyKey: "partner-alert/incident/1/org",
      }),
    ).resolves.toEqual({ messageId: "email-id" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        headers: expect.objectContaining({
          "idempotency-key": "partner-alert/incident/1/org",
        }),
      }),
    );
  });

  it("states the boundary with 999", () => {
    expect(partnerAlertTextForTest(alert)).toContain(
      "For immediate police, fire, or ambulance assistance in Bangladesh, call 999.",
    );
  });
});
