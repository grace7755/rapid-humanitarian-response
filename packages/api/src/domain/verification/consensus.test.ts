import { describe, expect, it } from "vitest";

import {
  evaluateConsensus,
  evaluateVerifier,
  VERIFIER_ROLES,
} from "./consensus";

const official = {
  id: "official",
  isIndependent: true,
  publisherDomain: "ffwc.gov.bd",
  relationship: "supports" as const,
  sourceCategory: "official_authority" as const,
};
const humanitarian = {
  id: "humanitarian",
  isIndependent: true,
  publisherDomain: "reliefweb.int",
  relationship: "supports" as const,
  sourceCategory: "established_humanitarian" as const,
};

describe("autonomous verification consensus", () => {
  it("passes only when all roles complete a strict cross-family quorum", () => {
    const evidence = [official, humanitarian];
    const verdicts = VERIFIER_ROLES.map((role) =>
      evaluateVerifier(role, evidence),
    );

    expect(
      evaluateConsensus({
        confidenceScore: 90,
        district: "Feni",
        incidentType: "flood",
        locationText: "Feni Sadar",
        occurredAt: "2026-07-22T08:00:00.000Z",
        verdicts,
      }),
    ).toEqual({ passed: true, reasons: [], status: "corroborated" });
  });

  it("does not count two publishers from one source family as strict quorum", () => {
    const evidence = [
      humanitarian,
      { ...humanitarian, id: "news", publisherDomain: "news.example" },
    ];
    const verdicts = VERIFIER_ROLES.map((role) =>
      evaluateVerifier(role, evidence),
    );
    const result = evaluateConsensus({
      confidenceScore: 90,
      district: "Feni",
      incidentType: "flood",
      locationText: "Feni Sadar",
      occurredAt: new Date(),
      verdicts,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons).toContain("independent-source-families");
  });

  it("fails closed when a credible source contradicts the incident", () => {
    const contradiction = {
      ...official,
      id: "contradiction",
      relationship: "contradicts" as const,
    };
    const evidence = [official, humanitarian, contradiction];
    const verdicts = VERIFIER_ROLES.map((role) =>
      evaluateVerifier(role, evidence),
    );

    expect(
      evaluateConsensus({
        confidenceScore: 90,
        district: "Feni",
        incidentType: "flood",
        locationText: "Feni Sadar",
        occurredAt: new Date(),
        verdicts,
      }),
    ).toEqual({
      passed: false,
      reasons: ["credible-contradiction"],
      status: "contradicted",
    });
  });

  it("fails closed when required facts or confidence are missing", () => {
    const evidence = [official, humanitarian];
    const verdicts = VERIFIER_ROLES.map((role) =>
      evaluateVerifier(role, evidence),
    );
    const result = evaluateConsensus({
      confidenceScore: 79,
      district: null,
      incidentType: null,
      locationText: null,
      occurredAt: null,
      verdicts,
    });

    expect(result.passed).toBe(false);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        "confidence-below-80",
        "missing-location",
        "missing-incident-type",
        "missing-occurrence-time",
      ]),
    );
  });
});
