import { ORPCError } from "@orpc/server";
import { describe, expect, it } from "vitest";

import { classifyError, publicErrorBody } from "./errors";

describe("safe API errors", () => {
  it("classifies known oRPC errors without exposing their messages", () => {
    expect(classifyError(new ORPCError("BAD_REQUEST"))).toBe("validation");
    expect(classifyError(new ORPCError("UNAUTHORIZED"))).toBe("authentication");
  });

  it("uses a generic public body for unexpected failures", () => {
    const body = publicErrorBody("request-123");

    expect(body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(body.error.requestId).toBe("request-123");
    expect(JSON.stringify(body)).not.toContain("database");
  });
});
