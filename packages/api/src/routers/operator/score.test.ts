import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const evidenceMocks = vi.hoisted(() => ({
  listEvidenceForIncident: vi.fn(),
}));
const incidentMocks = vi.hoisted(() => ({
  getIncidentForOperator: vi.fn(),
  updateIncidentScores: vi.fn(),
}));

vi.mock("@my-better-t-app/db/queries/evidence", () => evidenceMocks);
vi.mock("@my-better-t-app/db/queries/incidents", () => incidentMocks);
vi.mock("@my-better-t-app/db/queries/users", () => ({
  getUserById: vi.fn().mockResolvedValue({
    email: "operator@example.org",
    id: "operator-id",
    name: "Operator",
  }),
}));
vi.mock("@my-better-t-app/env/server", () => ({
  env: { OPERATOR_EMAIL_ALLOWLIST: ["operator@example.org"] },
}));

import { scoreRouter } from "./score";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const context = {
  log: {},
  requestId: "test-request",
  session: {
    user: { email: "operator@example.org", id: "operator-id" },
  },
};
const incident = {
  confidenceScore: 0,
  district: "Cox's Bazar",
  factsApproved: false,
  id: incidentId,
  locationText: null,
  occurredAt: new Date("2026-07-19T08:00:00.000Z"),
  occurredAtPrecision: "approximate",
  riskFlags: {
    accessBlocked: false,
    displacement: false,
    noFood: false,
    noSafeWater: true,
    peopleTrapped: false,
    urgentMedicalNeed: false,
    vulnerableGroupsReported: false,
  },
  urgencyScore: 0,
};

describe("explicit score recalculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incidentMocks.getIncidentForOperator.mockResolvedValue(incident);
    evidenceMocks.listEvidenceForIncident.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        isIndependent: false,
        relationship: "supports",
        sourceCategory: "official_authority",
      },
    ]);
  });

  it("calculates a preview without persisting", async () => {
    const result = await call(
      scoreRouter.get,
      { incidentId },
      { context: context as never },
    );

    expect(result.confidence.score).toBe(70);
    expect(result.urgency.score).toBe(20);
    expect(result.isStale).toBe(true);
    expect(incidentMocks.updateIncidentScores).not.toHaveBeenCalled();
  });

  it("persists both scores only on explicit recalculation", async () => {
    incidentMocks.updateIncidentScores.mockResolvedValue({
      confidenceScore: 70,
      id: incidentId,
      urgencyScore: 20,
    });
    incidentMocks.getIncidentForOperator
      .mockResolvedValueOnce(incident)
      .mockResolvedValueOnce({
        ...incident,
        confidenceScore: 70,
        urgencyScore: 20,
      });

    const result = await call(
      scoreRouter.recalculate,
      { incidentId },
      { context: context as never },
    );

    expect(incidentMocks.updateIncidentScores).toHaveBeenCalledWith(
      incidentId,
      { confidenceScore: 70, urgencyScore: 20 },
      "operator-id",
    );
    expect(result.isStale).toBe(false);
  });
});
