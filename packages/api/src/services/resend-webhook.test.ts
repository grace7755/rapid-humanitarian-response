import { describe, expect, it } from "vitest";

import {
  notificationStatusFromResendEvent,
  verifyResendWebhook,
} from "./resend-webhook";

function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

async function signedFixture() {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const secret = `whsec_${base64(keyBytes)}`;
  const id = "msg_webhook_1";
  const timestamp = String(
    Math.floor(new Date("2026-07-22T10:20:00.000+06:00").getTime() / 1000),
  );
  const payload = JSON.stringify({
    created_at: "2026-07-22T10:00:00.000Z",
    data: { email_id: "email-1" },
    type: "email.delivered",
  });
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${payload}`),
  );
  return {
    id,
    payload,
    secret,
    signature: `v1,${base64(new Uint8Array(digest))}`,
    timestamp,
  };
}

describe("Resend webhook verification", () => {
  it("accepts a current valid Svix signature", async () => {
    const fixture = await signedFixture();
    await expect(
      verifyResendWebhook({
        ...fixture,
        now: new Date("2026-07-22T10:20:00.000+06:00"),
      }),
    ).resolves.toMatchObject({ type: "email.delivered" });
  });

  it("rejects a modified signature", async () => {
    const fixture = await signedFixture();
    await expect(
      verifyResendWebhook({
        ...fixture,
        now: new Date("2026-07-22T10:20:00.000+06:00"),
        signature: "v1,ZmFrZQ==",
      }),
    ).rejects.toThrow("WEBHOOK_SIGNATURE_INVALID");
  });

  it("maps only outcome-bearing delivery events", () => {
    expect(notificationStatusFromResendEvent("email.bounced")).toBe("bounced");
    expect(notificationStatusFromResendEvent("email.sent")).toBeNull();
  });
});
