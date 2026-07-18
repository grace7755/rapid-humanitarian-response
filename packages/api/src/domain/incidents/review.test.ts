import { describe, expect, it } from "vitest";

import { getChangedReviewFields, reviewFieldsSchema } from "./review";

const currentIncident = {
  affectedEstimate: 120,
  district: "Cox's Bazar" as const,
  incidentType: "flood" as const,
  locationText: "Near the central market",
  needs: ["water", "shelter"] as const,
  occurredAt: new Date("2026-07-18T08:00:00.000Z"),
  occurredAtPrecision: "approximate" as const,
  riskFlags: {
    accessBlocked: false,
    displacement: true,
    noFood: false,
    noSafeWater: true,
    peopleTrapped: false,
    urgentMedicalNeed: false,
    vulnerableGroupsReported: false,
  },
  summary: "Flooding has affected buildings near the central market area.",
  title: "Flooding near central market",
  unknowns: ["Exact number of households"],
};

describe("operator incident review validation", () => {
  it.each([-1, 2_147_483_648, 1.5])(
    "rejects an affected estimate outside PostgreSQL integer bounds: %s",
    (affectedEstimate) => {
      expect(reviewFieldsSchema.safeParse({ affectedEstimate }).success).toBe(
        false,
      );
    },
  );

  it("rejects duplicate reviewed needs", () => {
    expect(
      reviewFieldsSchema.safeParse({ needs: ["water", "water"] }).success,
    ).toBe(false);
  });

  it("rejects duplicate unknowns after trimming", () => {
    expect(
      reviewFieldsSchema.safeParse({
        unknowns: ["Access status", " Access status "],
      }).success,
    ).toBe(false);
  });

  it("returns only actual changed field names in stable order", () => {
    expect(
      getChangedReviewFields(currentIncident, {
        affectedEstimate: 121,
        title: currentIncident.title,
        unknowns: [],
      }),
    ).toEqual(["affectedEstimate", "unknowns"]);
  });
});
