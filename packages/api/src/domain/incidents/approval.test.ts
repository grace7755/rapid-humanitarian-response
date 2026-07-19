import { describe, expect, it } from "vitest";

import { evaluateFactApprovalGate, evaluateOutreachGate } from "./approval";

const qualifying = {
  district: "Cox's Bazar",
  evidence: [
    {
      id: "one",
      isIndependent: true,
      relationship: "supports" as const,
      sourceCategory: "official_authority" as const,
    },
    {
      id: "two",
      isIndependent: true,
      relationship: "supports" as const,
      sourceCategory: "community_eyewitness" as const,
    },
  ],
  locationText: null,
  occurredAt: new Date("2026-07-19T08:00:00.000Z"),
  occurredAtPrecision: "approximate" as const,
};

describe("incident approval gates", () => {
  it("passes only with qualifying evidence, review state, and confirmation", () => {
    const result = evaluateFactApprovalGate({
      ...qualifying,
      confirmation: true,
      factsApproved: false,
      state: "reviewing",
    });

    expect(result.passed).toBe(true);
    expect(result.confidence.score).toBe(90);
    expect(result.conditions.every((condition) => condition.passed)).toBe(true);
  });

  it("fails when explicit operator confirmation is absent", () => {
    const result = evaluateFactApprovalGate({
      ...qualifying,
      confirmation: false,
      factsApproved: false,
      state: "reviewing",
    });

    expect(result.passed).toBe(false);
    expect(
      result.conditions.find(
        (condition) => condition.key === "operator-confirmation",
      )?.passed,
    ).toBe(false);
  });

  it("blocks outreach when facts are not approved", () => {
    expect(
      evaluateOutreachGate({ ...qualifying, factsApproved: false }).passed,
    ).toBe(false);
  });

  it("blocks approval on a credible contradiction", () => {
    expect(
      evaluateFactApprovalGate({
        ...qualifying,
        confirmation: true,
        evidence: [
          ...qualifying.evidence,
          {
            id: "three",
            isIndependent: true,
            relationship: "contradicts",
            sourceCategory: "local_news",
          } as const,
        ],
        factsApproved: false,
        state: "reviewing",
      }).passed,
    ).toBe(false);
  });
});
