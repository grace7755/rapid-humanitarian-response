import { describe, expect, it } from "vitest";

import { safeErrorCode } from "./errors.js";

describe("agent error boundary", () => {
  it("stores bounded error codes without leaking provider messages", () => {
    expect(safeErrorCode(new Error("Model provider error: token=secret"))).toBe(
      "AGENT_EXECUTION_FAILED",
    );
    expect(safeErrorCode("unknown")).toBe("UNKNOWN_ERROR");
  });
});
