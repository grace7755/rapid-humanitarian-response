import { describe, expect, it } from "vitest";

import { calculateConfidence, getConfidenceLabel } from "./confidence";

const baseInput = {
  district: "Cox's Bazar",
  locationText: "Near the central market",
  occurredAt: new Date("2026-07-19T08:00:00.000Z"),
  occurredAtPrecision: "approximate" as const,
};

function evidence(
  sourceCategory:
    | "official_authority"
    | "established_humanitarian"
    | "established_news"
    | "local_news"
    | "community_eyewitness"
    | "unknown",
  relationship: "supports" | "contradicts" | "context" = "supports",
  isIndependent = false,
) {
  return {
    id: crypto.randomUUID(),
    isIndependent,
    relationship,
    sourceCategory,
  };
}

describe("confidence scoring", () => {
  it("uses the highest supporting base and exact independence bonuses", () => {
    const result = calculateConfidence({
      ...baseInput,
      evidence: [
        evidence("local_news", "supports", true),
        evidence("community_eyewitness", "supports", true),
        evidence("unknown", "supports", true),
      ],
    });

    expect(result.score).toBe(70);
    expect(result.label).toBe("Needs Review");
    expect(result.breakdown.map((entry) => entry.points)).toEqual([40, 20, 10]);
  });

  it("does not infer independence from distinct evidence records", () => {
    expect(
      calculateConfidence({
        ...baseInput,
        evidence: [
          evidence("established_news"),
          evidence("local_news"),
          evidence("community_eyewitness"),
        ],
      }).score,
    ).toBe(50);
  });

  it("applies one credible contradiction penalty and missing-data penalties", () => {
    const result = calculateConfidence({
      district: null,
      evidence: [
        evidence("official_authority"),
        evidence("established_news", "contradicts"),
        evidence("local_news", "contradicts"),
      ],
      locationText: null,
      occurredAt: null,
      occurredAtPrecision: "unknown",
    });

    expect(result.score).toBe(20);
    expect(result.hasCredibleContradiction).toBe(true);
  });

  it("ignores context and low-credibility contradictions for the penalty", () => {
    expect(
      calculateConfidence({
        ...baseInput,
        evidence: [
          evidence("local_news"),
          evidence("community_eyewitness", "contradicts"),
          evidence("official_authority", "context"),
        ],
      }).score,
    ).toBe(40);
  });

  it.each([
    [0, "Unverified"],
    [39, "Unverified"],
    [40, "Needs Review"],
    [69, "Needs Review"],
    [70, "Needs Review"],
    [79, "Needs Review"],
    [80, "Corroborated"],
    [100, "Corroborated"],
  ] as const)("labels %s as %s", (score, label) => {
    expect(getConfidenceLabel(score)).toBe(label);
  });
});
