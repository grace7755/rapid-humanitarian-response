import { beforeEach, describe, expect, it, vi } from "vitest";

const incidentMocks = vi.hoisted(() => ({
  getIncidentForObserver: vi.fn(),
  markIncidentEscalationReady: vi.fn(),
}));
const matchMocks = vi.hoisted(() => ({
  replaceIncidentMatches: vi.fn(),
}));
const organizationMocks = vi.hoisted(() => ({
  listReviewedOrganizationCandidates: vi.fn(),
}));
const workflowMocks = vi.hoisted(() => ({ enqueueWorkflowJob: vi.fn() }));

vi.mock("@my-better-t-app/db/queries/incidents", () => incidentMocks);
vi.mock("@my-better-t-app/db/queries/matches", () => matchMocks);
vi.mock("@my-better-t-app/db/queries/organizations", () => organizationMocks);
vi.mock("@my-better-t-app/db/queries/workflows", () => workflowMocks);

import { runNgoMatchingAgent } from "./ngo-matching";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const organizationId = "02d108b7-4cf9-4437-8689-97f3d2b8a254";
const revision = 1;
const context = { jobId: crypto.randomUUID(), runId: crypto.randomUUID() };

const incident = {
  country: "Bangladesh",
  district: "Cox's Bazar",
  division: "Chattogram",
  id: incidentId,
  locationText: "Central market",
  needs: ["water"],
  occurredAt: new Date("2026-07-22T08:00:00.000Z"),
  occurredAtPrecision: "approximate",
  state: "corroborated",
  verificationRevision: revision,
  verificationStatus: "corroborated",
};

describe("NGO matching agent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incidentMocks.getIncidentForObserver.mockResolvedValue(incident);
    organizationMocks.listReviewedOrganizationCandidates.mockResolvedValue([
      {
        areasServed: ["Bangladesh", "Chattogram", "Cox's Bazar"],
        automationAllowed: true,
        contactEmail: "response@safe.example",
        id: organizationId,
        isDemo: true,
        name: "Safe Demo",
        reviewStatus: "reviewed",
        sectors: ["water_sanitation_hygiene"],
      },
    ]);
    matchMocks.replaceIncidentMatches.mockResolvedValue([]);
    incidentMocks.markIncidentEscalationReady.mockResolvedValue({
      id: incidentId,
    });
    workflowMocks.enqueueWorkflowJob.mockResolvedValue({ id: "job" });
  });

  it("persists a deterministic advisory shortlist", async () => {
    await expect(
      runNgoMatchingAgent(context, { incidentId, revision }),
    ).resolves.toEqual({ incidentId, matchCount: 1, topScore: 95 });

    expect(matchMocks.replaceIncidentMatches).toHaveBeenCalledWith(
      incidentId,
      [
        {
          organizationId,
          reasons: expect.any(Array),
          score: 95,
        },
      ],
      null,
    );
  });

  it("fails closed when approval became stale before execution", async () => {
    incidentMocks.getIncidentForObserver.mockResolvedValue({
      ...incident,
      verificationStatus: "pending",
    });

    await expect(
      runNgoMatchingAgent(context, { incidentId, revision }),
    ).rejects.toThrow("MATCHING_GATE_BLOCKED");
    expect(matchMocks.replaceIncidentMatches).not.toHaveBeenCalled();
  });
});
