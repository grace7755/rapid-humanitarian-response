import { describe, expect, it } from "vitest";

import {
  getEmailFromRequestBody,
  isObserverEmailAllowlisted,
  normalizeObserverEmail,
  requireAllowlistedObserverEmail,
} from "./allowlist";

describe("observer email allowlist", () => {
  const allowlist = ["observer@example.org"];

  it("normalizes email addresses before comparison", () => {
    expect(normalizeObserverEmail(" Observer@Example.ORG ")).toBe(
      "observer@example.org",
    );
    expect(
      isObserverEmailAllowlisted(" Observer@Example.ORG ", allowlist),
    ).toBe(true);
  });

  it("rejects missing and non-allowlisted emails", () => {
    expect(() =>
      requireAllowlistedObserverEmail("other@example.org", allowlist),
    ).toThrow("not authorized");
    expect(() => requireAllowlistedObserverEmail(undefined, allowlist)).toThrow(
      "not authorized",
    );
  });

  it("reads email only from object request bodies", () => {
    expect(getEmailFromRequestBody({ email: "observer@example.org" })).toBe(
      "observer@example.org",
    );
    expect(getEmailFromRequestBody(null)).toBeUndefined();
    expect(getEmailFromRequestBody("observer@example.org")).toBeUndefined();
  });
});
