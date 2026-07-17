import { describe, expect, it } from "vitest";

import {
  isOperatorEmailAllowlisted,
  normalizeOperatorEmail,
  requireAllowlistedOperatorEmail,
} from "./allowlist";

describe("operator email allowlist", () => {
  const allowlist = ["operator@example.org"];

  it("normalizes email addresses before comparison", () => {
    expect(normalizeOperatorEmail(" Operator@Example.ORG ")).toBe(
      "operator@example.org",
    );
    expect(
      isOperatorEmailAllowlisted(" Operator@Example.ORG ", allowlist),
    ).toBe(true);
  });

  it("rejects missing and non-allowlisted emails", () => {
    expect(() =>
      requireAllowlistedOperatorEmail("other@example.org", allowlist),
    ).toThrow("not authorized");
    expect(() => requireAllowlistedOperatorEmail(undefined, allowlist)).toThrow(
      "not authorized",
    );
  });
});
