import { describe, expect, it } from "bun:test";
import { z } from "zod";

import app, { shouldExposeApiReference } from "./index";

const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    requestId: z.string().min(1),
  }),
});

describe("Hono transport boundary", () => {
  it("rejects oversized RPC bodies with a safe response and request ID", async () => {
    const response = await app.request("/rpc/public/report/create", {
      body: "x".repeat(65 * 1024),
      headers: {
        "content-type": "text/plain",
      },
      method: "POST",
    });
    const body = errorResponseSchema.parse(await response.json());

    expect(response.status).toBe(413);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(body.error.code).toBe("PAYLOAD_TOO_LARGE");
    expect(body.error.requestId).toBeTruthy();
  });

  it("never exposes API reference routes in production", () => {
    expect(shouldExposeApiReference("production")).toBe(false);
    expect(shouldExposeApiReference("development")).toBe(true);
  });

  it("serves non-sensitive public system status without a session", async () => {
    const response = await app.request("/rpc/public/system/status", {
      method: "POST",
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).toContain("operational");
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
  });
});
