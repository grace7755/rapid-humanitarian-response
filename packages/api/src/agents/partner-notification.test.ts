import { beforeEach, describe, expect, it, vi } from "vitest";

const notificationMocks = vi.hoisted(() => ({
  createPartnerNotification: vi.fn(),
  getPartnerNotificationContext: vi.fn(),
  markPartnerNotificationSent: vi.fn(),
}));
vi.mock("@my-better-t-app/db/queries/notifications", () => notificationMocks);
vi.mock("@my-better-t-app/env/server", () => ({
  env: { AUTONOMOUS_ESCALATION_ENABLED: true, PARTNER_EMAIL_ENABLED: true },
}));

import { runPartnerNotificationAgent } from "./partner-notification";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const organizationId = "02d108b7-4cf9-4437-8689-97f3d2b8a254";
const context = { jobId: crypto.randomUUID(), runId: crypto.randomUUID() };
const eligibleContext = {
  automationAllowed: true,
  confidenceScore: 86,
  district: "Feni",
  incidentType: "flood",
  locationText: "Central Feni",
  needs: ["water"],
  organizationName: "Aid Partner",
  priorityLevel: "P1",
  recipientEmail: "alerts@example.org",
  reference: "RHR-123",
  reviewStatus: "reviewed",
  revision: 2,
  state: "escalation_ready",
  summary: "Flooding affects homes.",
  verificationStatus: "corroborated",
};

describe("partner notification agent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emails an eligible opted-in partner and records the provider ID", async () => {
    notificationMocks.getPartnerNotificationContext.mockResolvedValue(
      eligibleContext,
    );
    notificationMocks.createPartnerNotification.mockResolvedValue({
      created: true,
      notification: {
        id: "notice-1",
        idempotencyKey: "key-1",
        status: "queued",
      },
    });
    notificationMocks.markPartnerNotificationSent.mockResolvedValue({
      id: "notice-1",
      status: "sent",
    });
    const provider = {
      send: vi.fn().mockResolvedValue({ messageId: "email-1" }),
    };

    await expect(
      runPartnerNotificationAgent(
        context,
        { incidentId, organizationId, revision: 2 },
        provider,
      ),
    ).resolves.toMatchObject({
      providerMessageId: "email-1",
      skipped: false,
      status: "sent",
    });
    expect(provider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: "key-1",
        recipientEmail: "alerts@example.org",
      }),
    );
  });

  it("blocks delivery when partner consent is absent", async () => {
    notificationMocks.getPartnerNotificationContext.mockResolvedValue({
      ...eligibleContext,
      automationAllowed: false,
    });
    const provider = { send: vi.fn() };
    await expect(
      runPartnerNotificationAgent(
        context,
        { incidentId, organizationId, revision: 2 },
        provider,
      ),
    ).rejects.toThrow("PARTNER_NOTIFICATION_GATE_BLOCKED");
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("does not resend an existing idempotent notification", async () => {
    notificationMocks.getPartnerNotificationContext.mockResolvedValue(
      eligibleContext,
    );
    notificationMocks.createPartnerNotification.mockResolvedValue({
      created: false,
      notification: { id: "notice-1", idempotencyKey: "key-1", status: "sent" },
    });
    const provider = { send: vi.fn() };
    await expect(
      runPartnerNotificationAgent(
        context,
        { incidentId, organizationId, revision: 2 },
        provider,
      ),
    ).resolves.toMatchObject({ skipped: true, status: "sent" });
    expect(provider.send).not.toHaveBeenCalled();
  });
});
