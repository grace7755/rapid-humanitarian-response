import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contactMocks = vi.hoisted(() => ({
  claimApprovedVoiceAttempt: vi.fn(),
  createApprovedContactAttempt: vi.fn(),
  getContactApprovalContext: vi.fn(),
  getVoiceAttemptContext: vi.fn(),
  markContactAttemptFailed: vi.fn(),
  markContactAttemptStarted: vi.fn(),
}));
const startCall = vi.hoisted(() => vi.fn());

vi.mock("@my-better-t-app/db/queries/contact-attempts", () => contactMocks);
vi.mock("../../services/vapi.js", () => ({
  VapiVoiceProvider: class {
    startCall = startCall;
  },
}));
vi.mock("@my-better-t-app/db/queries/users", () => ({
  getUserById: vi.fn().mockResolvedValue({
    email: "operator@example.org",
    id: "operator-id",
    name: "Operator",
  }),
}));
vi.mock("@my-better-t-app/env/server", () => ({
  env: {
    LIVE_OUTREACH_ENABLED: true,
    OPERATOR_EMAIL_ALLOWLIST: ["operator@example.org"],
    PILOT_DISTRICTS: ["Feni"],
    VOICE_ENABLED: true,
  },
}));

import { contactRouter } from "./contact";

const attemptId = "02d108b7-4cf9-4437-8689-97f3d2b8a254";
const approvedAttempt = {
  attemptId,
  automationAllowed: true,
  channel: "voice",
  district: "Feni",
  factsApproved: true,
  incidentType: "flood",
  phoneNumber: "+8801000000000",
  providerCallId: null,
  reviewStatus: "reviewed",
  status: "approved",
  summary: "Flooding requires rescue support.",
  tier: 3,
  verificationStatus: "operator_approved",
};
const context = {
  log: {},
  requestId: "test-request",
  session: { user: { email: "operator@example.org", id: "operator-id" } },
};

describe("operator voice execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    contactMocks.getVoiceAttemptContext.mockResolvedValue(approvedAttempt);
  });

  it("does not call the provider when another request owns the claim", async () => {
    contactMocks.claimApprovedVoiceAttempt.mockResolvedValue(null);

    await expect(
      call(
        contactRouter.startVoice,
        { contactAttemptId: attemptId },
        { context: context as never },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    expect(startCall).not.toHaveBeenCalled();
  });

  it("records a safe failed state when the provider rejects the call", async () => {
    contactMocks.claimApprovedVoiceAttempt.mockResolvedValue({
      ...approvedAttempt,
      status: "queued",
    });
    startCall.mockRejectedValue(new Error("VOICE_PROVIDER_ERROR"));

    await expect(
      call(
        contactRouter.startVoice,
        { contactAttemptId: attemptId },
        { context: context as never },
      ),
    ).rejects.toBeDefined();

    expect(contactMocks.markContactAttemptFailed).toHaveBeenCalledWith(
      attemptId,
      "VOICE_PROVIDER_ERROR",
    );
  });

  it("records the provider ID only after winning the claim", async () => {
    contactMocks.claimApprovedVoiceAttempt.mockResolvedValue({
      ...approvedAttempt,
      status: "queued",
    });
    startCall.mockResolvedValue({
      providerCallId: "vapi-call",
      status: "queued",
    });
    contactMocks.markContactAttemptStarted.mockResolvedValue({
      id: attemptId,
      providerCallId: "vapi-call",
      status: "in_progress",
    });

    const result = await call(
      contactRouter.startVoice,
      { contactAttemptId: attemptId },
      { context: context as never },
    );

    expect(contactMocks.claimApprovedVoiceAttempt).toHaveBeenCalledBefore(
      startCall,
    );
    expect(contactMocks.markContactAttemptStarted).toHaveBeenCalledWith(
      attemptId,
      "vapi-call",
      "queued",
    );
    expect(result.status).toBe("in_progress");
  });
});
