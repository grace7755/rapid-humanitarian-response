import { describe, expect, it, vi } from "vitest";

vi.mock("@my-better-t-app/env/server", () => ({
  env: {
    VAPI_API_KEY: undefined,
    VAPI_PHONE_NUMBER_ID: undefined,
    VOICE_ENABLED: false,
  },
}));

import { contactOutcomeStatus } from "./vapi";

describe("Vapi outcome classification", () => {
  it.each([
    "assistant-error",
    "pipeline-error-openai-llm-failed",
    "call.start.error-subscription-frozen",
    "phone-call-provider-closed-websocket",
    "customer-did-not-answer",
  ])("marks %s as failed", (reason) => {
    expect(contactOutcomeStatus(reason)).toBe("failed");
  });

  it.each([
    "assistant-ended-call",
    "customer-ended-call",
    "exceeded-max-duration",
    "voicemail",
  ])("marks %s as completed", (reason) => {
    expect(contactOutcomeStatus(reason)).toBe("completed");
  });
});
