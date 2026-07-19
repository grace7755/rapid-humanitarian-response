import { describe, expect, it } from "vitest";

import { calculateUrgency, getUrgencyLabel } from "./urgency";

const noFlags = {
  accessBlocked: false,
  displacement: false,
  noFood: false,
  noSafeWater: false,
  peopleTrapped: false,
  urgentMedicalNeed: false,
  vulnerableGroupsReported: false,
};

describe("urgency scoring", () => {
  it("applies every reported-condition point value and clamps to 100", () => {
    const result = calculateUrgency({
      riskFlags: Object.fromEntries(
        Object.keys(noFlags).map((key) => [key, true]),
      ) as typeof noFlags,
    });

    expect(result.score).toBe(100);
    expect(result.breakdown).toHaveLength(7);
    expect(result.label).toBe("Critical");
  });

  it("returns zero with an explanatory Low label when no flags are set", () => {
    expect(calculateUrgency({ riskFlags: noFlags })).toEqual({
      breakdown: [],
      label: "Low",
      score: 0,
    });
  });

  it.each([
    [24, "Low"],
    [25, "Medium"],
    [49, "Medium"],
    [50, "High"],
    [74, "High"],
    [75, "Critical"],
  ] as const)("labels %s as %s", (score, label) => {
    expect(getUrgencyLabel(score)).toBe(label);
  });
});
