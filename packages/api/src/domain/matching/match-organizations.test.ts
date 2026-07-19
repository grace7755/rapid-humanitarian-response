import { describe, expect, it } from "vitest";

import { matchOrganizations } from "./match-organizations";

const incident = {
  country: "Bangladesh",
  district: "Cox's Bazar",
  division: "Chattogram",
  needs: ["water", "shelter", "food"] as const,
};

function organization(
  id: string,
  overrides: Partial<{
    areasServed: string[];
    contactEmail: string | null;
    isDemo: boolean;
    name: string;
    reviewStatus: "reviewed" | "needs_review" | "do_not_contact";
    sectors: Array<
      | "water_sanitation_hygiene"
      | "shelter"
      | "camp_management"
      | "food_assistance"
      | "nutrition"
    >;
  }> = {},
) {
  return {
    areasServed: ["Bangladesh", "Chattogram", "Cox's Bazar"],
    contactEmail: "response@safe.example",
    id,
    isDemo: false,
    name: `Organization ${id}`,
    reviewStatus: "reviewed" as const,
    sectors: ["water_sanitation_hygiene", "shelter"] as const,
    ...overrides,
  };
}

describe("reviewed organization matching", () => {
  it("applies exact sector, geography, and contact scoring with a clamp", () => {
    const [match] = matchOrganizations(incident, [organization("a")]);
    expect(match?.score).toBe(100);
    expect(match?.availability).toBe("Unknown in Version 1");
  });

  it("excludes non-reviewed records and demo records without .example email", () => {
    expect(
      matchOrganizations(incident, [
        organization("a", { reviewStatus: "needs_review" }),
        organization("b", {
          contactEmail: "real@example.org",
          isDemo: true,
        }),
      ]),
    ).toEqual([]);
  });

  it("uses a stable name/id tie-breaker and keeps only three", () => {
    const matches = matchOrganizations(incident, [
      organization("d", { name: "Delta" }),
      organization("c", { name: "Charlie" }),
      organization("b", { name: "Bravo" }),
      organization("a", { name: "Alpha" }),
    ]);

    expect(matches.map((match) => match.organizationName)).toEqual([
      "Alpha",
      "Bravo",
      "Charlie",
    ]);
  });

  it("returns an empty state without weakening review rules", () => {
    expect(
      matchOrganizations({ ...incident, needs: ["other"] }, [
        organization("a", {
          areasServed: [],
          contactEmail: null,
          sectors: [],
        }),
      ]),
    ).toEqual([]);
  });
});
