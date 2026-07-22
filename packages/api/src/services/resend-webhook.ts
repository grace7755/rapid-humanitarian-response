import { z } from "zod";

const eventSchema = z
  .object({
    created_at: z.string(),
    data: z.object({ email_id: z.string().min(1) }).passthrough(),
    type: z.enum([
      "email.bounced",
      "email.delivered",
      "email.delivery_delayed",
      "email.failed",
      "email.sent",
    ]),
  })
  .passthrough();

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

export async function verifyResendWebhook(input: {
  id: string;
  payload: string;
  secret: string;
  signature: string;
  timestamp: string;
  now?: Date;
}) {
  const timestampSeconds = Number(input.timestamp);
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > 300
  ) {
    throw new Error("WEBHOOK_TIMESTAMP_INVALID");
  }
  const encodedSecret = input.secret.startsWith("whsec_")
    ? input.secret.slice("whsec_".length)
    : input.secret;
  const key = await crypto.subtle.importKey(
    "raw",
    decodeBase64(encodedSecret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signed = new TextEncoder().encode(
    `${input.id}.${input.timestamp}.${input.payload}`,
  );
  const expected = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, signed),
  );
  const valid = input.signature.split(" ").some((candidate) => {
    const [version, encoded] = candidate.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    try {
      return equalBytes(expected, decodeBase64(encoded));
    } catch {
      return false;
    }
  });
  if (!valid) throw new Error("WEBHOOK_SIGNATURE_INVALID");
  return eventSchema.parse(JSON.parse(input.payload));
}

export function notificationStatusFromResendEvent(type: string) {
  if (type === "email.delivered") return "delivered" as const;
  if (type === "email.delivery_delayed") return "delayed" as const;
  if (type === "email.bounced") return "bounced" as const;
  if (type === "email.failed") return "failed" as const;
  return null;
}
