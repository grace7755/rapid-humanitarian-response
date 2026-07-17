import { describe, expect, it } from "vitest";

import {
  AUDIT_EVENT_NAMES,
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  PILOT_COUNTRY,
  PILOT_DISTRICTS,
  PILOT_DIVISION,
} from "./constants";

describe("incident constants", () => {
  it("keeps pilot geography and controlled values centralized", () => {
    expect(PILOT_COUNTRY).toBe("Bangladesh");
    expect(PILOT_DIVISION).toBe("Chattogram");
    expect(PILOT_DISTRICTS).toContain("Cox's Bazar");
    expect(INCIDENT_TYPES).toContain("flood");
    expect(INCIDENT_NEEDS).toContain("water");
  });

  it("does not contain duplicate audit event names", () => {
    expect(new Set(AUDIT_EVENT_NAMES).size).toBe(AUDIT_EVENT_NAMES.length);
  });
});
