import { env } from "@my-better-t-app/env/server";
import { z } from "zod";

import type {
  ModelGateway,
  StructuredModelRequest,
  StructuredModelResult,
} from "../agents/contracts.js";

const openRouterResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string() }),
      }),
    )
    .min(1),
  model: z.string(),
});

export class OpenRouterModelGateway implements ModelGateway {
  constructor(private readonly fetchImplementation: typeof fetch = fetch) {}

  async generateStructured<T>(
    request: StructuredModelRequest<T>,
  ): Promise<StructuredModelResult<T>> {
    if (!env.OPENROUTER_API_KEY || !env.OPENROUTER_MODEL) {
      throw new Error("MODEL_NOT_CONFIGURED");
    }

    const response = await this.fetchImplementation(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        body: JSON.stringify({
          messages: [
            { content: request.system, role: "system" },
            { content: request.user, role: "user" },
          ],
          model: env.OPENROUTER_MODEL,
          response_format: { type: "json_object" },
          temperature: 0,
        }),
        headers: {
          authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
          "content-type": "application/json",
          ...(env.OPENROUTER_APP_NAME
            ? { "x-title": env.OPENROUTER_APP_NAME }
            : {}),
          ...(env.OPENROUTER_APP_URL
            ? { "http-referer": env.OPENROUTER_APP_URL }
            : {}),
        },
        method: "POST",
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!response.ok) throw new Error("MODEL_PROVIDER_ERROR");

    const parsed = openRouterResponseSchema.parse(await response.json());
    let json: unknown;
    try {
      json = JSON.parse(parsed.choices[0]?.message.content ?? "");
    } catch {
      throw new Error("MODEL_INVALID_JSON");
    }

    return {
      modelId: parsed.model,
      output: request.schema.parse(json),
      provider: "openrouter",
    };
  }
}
