import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const evidenceMocks = vi.hoisted(() => ({
  listEvidenceForIncident: vi.fn(),
}));
const incidentMocks = vi.hoisted(() => ({
  getIncidentForOperator: vi.fn(),
}));
const matchMocks = vi.hoisted(() => ({
  listIncidentMatches: vi.fn(),
  replaceIncidentMatches: vi.fn(),
}));
const organizationMocks = vi.hoisted(() => ({
  listReviewedOrganizationCandidates: vi.fn(),
}));

vi.mock("@my-better-t-app/db/queries/evidence", () => evidenceMocks);
vi.mock("@my-better-t-app/db/queries/incidents", () => incidentMocks);
vi.mock("@my-better-t-app/db/queries/matches", () => matchMocks);
vi.mock("@my-better-t-app/db/queries/organizations", () => organizationMocks);
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

import { matchRouter } from "./match";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const organizationId = "02d108b7-4cf9-4437-8689-97f3d2b8a254";
const context = {
  log: {},
  requestId: "test-request",
  session: {
    user: { email: "operator@example.org", id: "operator-id" },
  },
};
const incident = {
  country: "Bangladesh",
  district: "Cox's Bazar",
  division: "Chattogram",
  factsApproved: true,
  id: incidentId,
  locationText: "Central market",
  needs: ["water"],
  occurredAt: new Date("2026-07-19T08:00:00.000Z"),
  occurredAtPrecision: "approximate",
};
const supportingEvidence = [
  {
    id: crypto.randomUUID(),
    isIndependent: false,
    relationship: "supports",
    sourceCategory: "official_authority",
  },
];
const candidate = {
  areasServed: ["Bangladesh", "Chattogram", "Cox's Bazar"],
  contactEmail: "response@safe.example",
  id: organizationId,
  isDemo: true,
  name: "Safe Demo",
  reviewStatus: "reviewed",
  sectors: ["water_sanitation_hygiene"],
};
const storedMatch = {
  contactEmail: candidate.contactEmail,
  createdAt: new Date("2026-07-19T09:00:00.000Z"),
  id: crypto.randomUUID(),
  isDemo: true,
  organizationId,
  organizationName: candidate.name,
  organizationWebsite: "https://safe.example",
  reasons: ["Relevant sector: water sanitation hygiene"],
  reviewStatus: "reviewed",
  score: 95,
};

describe("operator organization matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incidentMocks.getIncidentForOperator.mockResolvedValue(incident);
    evidenceMocks.listEvidenceForIncident.mockResolvedValue(supportingEvidence);
    organizationMocks.listReviewedOrganizationCandidates.mockResolvedValue([
      candidate,
    ]);
    matchMocks.replaceIncidentMatches.mockResolvedValue([]);
    matchMocks.listIncidentMatches.mockResolvedValue([storedMatch]);
  });

  it("revalidates the gate and persists only deterministic safe fields", async () => {
    const result = await call(
      matchRouter.generate,
      { incidentId },
      { context: context as never },
    );

    expect(matchMocks.replaceIncidentMatches).toHaveBeenCalledWith(
      incidentId,
      [
        {
          organizationId,
          reasons: expect.any(Array),
          score: 95,
        },
      ],
      "operator-id",
    );
    expect(result[0]).toMatchObject({
      availability: "Unknown in Version 1",
      isDemo: true,
      organizationId,
    });
  });

  it("blocks matching when facts are not approved", async () => {
    incidentMocks.getIncidentForOperator.mockResolvedValue({
      ...incident,
      factsApproved: false,
    });

    await expect(
      call(matchRouter.generate, { incidentId }, { context: context as never }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(matchMocks.replaceIncidentMatches).not.toHaveBeenCalled();
  });
});
