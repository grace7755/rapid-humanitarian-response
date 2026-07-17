import { describe, expect, it } from "vitest";

import { CASE_STATES } from "./constants";
import {
  canTransitionIncident,
  getAllowedTransitions,
} from "./state-machine";

const allowedTransitions = [
  ["submitted", "reviewing"],
  ["reviewing", "corroborated"],
  ["reviewing", "rejected"],
  ["corroborated", "outreach_ready"],
  ["corroborated", "reviewing"],
  ["outreach_ready", "contact_attempted"],
  ["outreach_ready", "reviewing"],
  ["contact_attempted", "closed"],
  ["contact_attempted", "reviewing"],
] as const;

describe("incident state machine", () => {
  it.each(allowedTransitions)("allows %s to transition to %s", (from, to) => {
    expect(canTransitionIncident(from, to)).toBe(true);
  });

  it("rejects every transition not explicitly listed", () => {
    for (const from of CASE_STATES) {
      for (const to of CASE_STATES) {
        const isListed = allowedTransitions.some(
          ([listedFrom, listedTo]) =>
            listedFrom === from && listedTo === to,
        );
        expect(canTransitionIncident(from, to)).toBe(isListed);
      }
    }
  });

  it("makes closed and rejected terminal", () => {
    expect(getAllowedTransitions("closed")).toEqual([]);
    expect(getAllowedTransitions("rejected")).toEqual([]);
  });
});
