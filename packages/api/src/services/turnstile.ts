import { z } from "zod";

const turnstileResponseSchema = z.object({
  "error-codes": z.array(z.string()).optional(),
  success: z.boolean(),
});

export type TurnstileVerificationInput = {
  remoteIp?: string;
  secret: string;
  token: string;
};

export async function verifyTurnstileToken(
  input: TurnstileVerificationInput,
  fetchImplementation: typeof fetch = fetch,
) {
  if (!input.secret || !input.token) return false;

  try {
    const response = await fetchImplementation(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          remoteip: input.remoteIp,
          response: input.token,
          secret: input.secret,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) return false;

    const result = turnstileResponseSchema.safeParse(await response.json());
    return result.success && result.data.success;
  } catch {
    return false;
  }
}
