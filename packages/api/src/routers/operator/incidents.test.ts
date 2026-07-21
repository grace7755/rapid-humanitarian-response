import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  approveIncidentFacts: vi.fn(),
  getIncidentForOperator: vi.fn(),
  listIncidents: vi.fn(),
  startIncidentReview: vi.fn(),
  updateIncidentReview: vi.fn(),
  updateIncidentState: vi.fn(),
}));

vi.mock("@my-better-t-app/db/queries/incidents", () => databaseMocks);
const evidenceMocks = vi.hoisted(() => ({
  listEvidenceForIncident: vi.fn(),
}));
vi.mock("@my-better-t-app/db/queries/evidence", () => evidenceMocks);
const workflowMocks = vi.hoisted(() => ({
  enqueueWorkflowJob: vi.fn(),
}));
vi.mock("@my-better-t-app/db/queries/workflows", () => workflowMocks);
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
    evidenceMocks.listEvidenceForIncident.mockResolvedValue([]);
    workflowMocks.enqueueWorkflowJob.mockResolvedValue({ id: "job" });
  });

  it("rejects direct transitions into fact-approval-controlled state", async () => {
    await expect(
      call(
        incidentRouter.changeState,
        { incidentId, toState: "corroborated" },
        { context: context as never },
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(databaseMocks.updateIncidentState).not.toHaveBeenCalled();
  });

  it("recalculates and atomically approves qualifying facts", async () => {
    const reviewedAt = new Date("2026-07-22T09:00:00.000Z");
    const reviewing = { ...baseIncident, state: "reviewing" };
    const corroborated = {
      ...reviewing,
      confidenceScore: 80,
      factsApproved: true,
      reviewedAt,
      state: "corroborated",
      urgencyScore: 20,
    };
    databaseMocks.getIncidentForOperator
      .mockResolvedValueOnce(reviewing)
      .mockResolvedValueOnce(corroborated);
    evidenceMocks.listEvidenceForIncident.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        isIndependent: true,
        relationship: "supports",
        sourceCategory: "official_authority",
      },
      {
        id: crypto.randomUUID(),
        isIndependent: true,
        relationship: "supports",
        sourceCategory: "community_eyewitness",
      },
    ]);
    databaseMocks.approveIncidentFacts.mockResolvedValue({
      factsApproved: true,
      id: incidentId,
    });

    const result = await call(
      incidentRouter.approveFacts,
      { confirmation: true, incidentId },
      { context: context as never },
    );

    expect(databaseMocks.approveIncidentFacts).toHaveBeenCalledWith(
      incidentId,
      "operator-id",
      { confidenceScore: 80, urgencyScore: 20 },
    );
    expect(workflowMocks.enqueueWorkflowJob).not.toHaveBeenCalled();
    expect(result.state).toBe("corroborated");
  });

  it("re-enqueues the same approval revision idempotently on retry", async () => {
    const reviewedAt = new Date("2026-07-22T09:00:00.000Z");
    const corroborated = {
      ...baseIncident,
      confidenceScore: 80,
      factsApproved: true,
      occurredAt: new Date("2026-07-22T08:00:00.000Z"),
      occurredAtPrecision: "approximate",
      reviewedAt,
      state: "corroborated",
    };
    databaseMocks.getIncidentForOperator.mockResolvedValue(corroborated);
    evidenceMocks.listEvidenceForIncident.mockResolvedValue([
      {
        id: crypto.randomUUID(),
        isIndependent: false,
        relationship: "supports",
        sourceCategory: "official_authority",
      },
    ]);

    await call(
      incidentRouter.approveFacts,
      { confirmation: true, incidentId },
      { context: context as never },
    );

    expect(databaseMocks.approveIncidentFacts).not.toHaveBeenCalled();
    expect(workflowMocks.enqueueWorkflowJob).toHaveBeenCalledWith({
      idempotencyKey: `ngo_matching:${incidentId}:${reviewedAt.toISOString()}`,
      jobType: "ngo_matching",
      payload: { incidentId, requestedByUserId: "operator-id" },
    });
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
