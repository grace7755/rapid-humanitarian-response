import { describe, expect, it } from "vitest";

import {
  getEmailFromRequestBody,
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

  it("reads email only from object request bodies", () => {
    expect(getEmailFromRequestBody({ email: "operator@example.org" })).toBe(
      "operator@example.org",
    );
    expect(getEmailFromRequestBody(null)).toBeUndefined();
    expect(getEmailFromRequestBody("operator@example.org")).toBeUndefined();
  });
});
