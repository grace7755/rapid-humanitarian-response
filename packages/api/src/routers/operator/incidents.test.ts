import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  getIncidentForOperator: vi.fn(),
  listIncidents: vi.fn(),
  startIncidentReview: vi.fn(),
  updateIncidentReview: vi.fn(),
  updateIncidentState: vi.fn(),
}));

vi.mock("@my-better-t-app/db/queries/incidents", () => databaseMocks);
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

import { incidentRouter } from "./incidents";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const baseIncident = {
  affectedEstimate: 120,
  confidenceScore: 50,
  country: "Bangladesh",
  createdAt: new Date("2026-07-18T08:00:00.000Z"),
  district: "Cox's Bazar",
  division: "Chattogram",
  extractionStatus: "pending",
  factsApproved: false,
  id: incidentId,
  incidentType: "flood",
  locationText: "Near the central market",
  modelId: null,
  needs: ["water", "shelter"] as Array<"water" | "shelter">,
  occurredAt: null,
  occurredAtPrecision: "unknown",
  rawReport: "{}",
  reference: "RHR-0123456789ABCDEF0123456789ABCDEF",
  reviewedAt: null,
  reviewedByUserId: null,
  riskFlags: {
    accessBlocked: false,
    displacement: false,
    noFood: false,
    noSafeWater: true,
    peopleTrapped: false,
    urgentMedicalNeed: false,
    vulnerableGroupsReported: false,
  },
  sourceType: "community",
  sourceUrl: null,
  state: "submitted",
  summary: null,
  title: null,
  unknowns: [],
  updatedAt: new Date("2026-07-18T08:00:00.000Z"),
  urgencyScore: 60,
};

const context = {
  log: {},
  requestId: "test-request",
  session: {
    user: {
      email: "operator@example.org",
      id: "operator-id",
    },
  },
};

describe("operator incident mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates state changes to the atomic database mutation", async () => {
    const reviewingIncident = { ...baseIncident, state: "reviewing" };
    databaseMocks.getIncidentForOperator
      .mockResolvedValueOnce(baseIncident)
      .mockResolvedValueOnce(reviewingIncident);
    databaseMocks.updateIncidentState.mockResolvedValue({
      id: incidentId,
      state: "reviewing",
    });

    await call(
      incidentRouter.changeState,
      { incidentId, toState: "reviewing" },
      { context: context as never },
    );

    expect(databaseMocks.updateIncidentState).toHaveBeenCalledWith(
      incidentId,
      "submitted",
      "reviewing",
      "operator-id",
    );
  });

  it("passes only actual changed field names to the atomic edit mutation", async () => {
    const reviewedIncident = {
      ...baseIncident,
      affectedEstimate: 121,
      title: "Flooding near central market",
      updatedAt: new Date("2026-07-18T09:00:00.000Z"),
    };
    databaseMocks.getIncidentForOperator
      .mockResolvedValueOnce(baseIncident)
      .mockResolvedValueOnce(reviewedIncident);
    databaseMocks.updateIncidentReview.mockResolvedValue({
      id: incidentId,
      updatedAt: reviewedIncident.updatedAt,
    });

    await call(
      incidentRouter.update,
      {
        incidentId,
        values: {
          affectedEstimate: 121,
          needs: baseIncident.needs,
          title: "Flooding near central market",
        },
      },
      { context: context as never },
    );

    expect(databaseMocks.updateIncidentReview).toHaveBeenCalledWith(
      incidentId,
      {
        affectedEstimate: 121,
        needs: baseIncident.needs,
        title: "Flooding near central market",
      },
      "operator-id",
      "affectedEstimate,title",
    );
  });

  it("skips database writes when reviewed values are unchanged", async () => {
    databaseMocks.getIncidentForOperator.mockResolvedValue(baseIncident);

    await call(
      incidentRouter.update,
      {
        incidentId,
        values: {
          affectedEstimate: baseIncident.affectedEstimate,
          needs: baseIncident.needs,
        },
      },
      { context: context as never },
    );

    expect(databaseMocks.updateIncidentReview).not.toHaveBeenCalled();
  });
});
