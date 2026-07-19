import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const evidenceMocks = vi.hoisted(() => ({
  addEvidence: vi.fn(),
  listEvidenceForIncident: vi.fn(),
  removeEvidence: vi.fn(),
}));
const incidentMocks = vi.hoisted(() => ({
  getIncidentForOperator: vi.fn(),
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

import { evidenceRouter } from "./evidence";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const evidenceId = "02d108b7-4cf9-4437-8689-97f3d2b8a254";
const context = {
  log: {},
  requestId: "test-request",
  session: {
    user: { email: "operator@example.org", id: "operator-id" },
  },
};
const record = {
  createdAt: new Date("2026-07-19T08:00:00.000Z"),
  createdByUserId: "operator-id",
  id: evidenceId,
  isIndependent: true,
  note: null,
  publishedAt: null,
  publisherDomain: "news.example",
  relationship: "supports",
  sourceCategory: "local_news",
  sourceName: "Local News",
  url: "https://news.example/update",
};

describe("operator evidence procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    incidentMocks.getIncidentForOperator.mockResolvedValue({ id: incidentId });
    evidenceMocks.listEvidenceForIncident.mockResolvedValue([record]);
  });

  it("passes no browser-provided publisher domain to persistence", async () => {
    evidenceMocks.addEvidence.mockResolvedValue({
      id: evidenceId,
      incidentId,
      publisherDomain: "news.example",
    });

    await call(
      evidenceRouter.create,
      {
        incidentId,
        isIndependent: true,
        relationship: "supports",
        sourceCategory: "local_news",
        sourceName: "Local News",
        url: "https://news.example/update",
      },
      { context: context as never },
    );

    expect(evidenceMocks.addEvidence).toHaveBeenCalledWith({
      createdByUserId: "operator-id",
      incidentId,
      isIndependent: true,
      note: null,
      publishedAt: null,
      relationship: "supports",
      sourceCategory: "local_news",
      sourceName: "Local News",
      url: "https://news.example/update",
    });
  });

  it("rejects non-HTTP evidence URLs before persistence", async () => {
    await expect(
      call(
        evidenceRouter.create,
        {
          incidentId,
          isIndependent: false,
          relationship: "context",
          sourceCategory: "unknown",
          sourceName: "Unsafe",
          url: "file:///private/evidence",
        },
        { context: context as never },
      ),
    ).rejects.toBeDefined();
    expect(evidenceMocks.addEvidence).not.toHaveBeenCalled();
  });

  it("scopes removal to both evidence and incident IDs", async () => {
    evidenceMocks.removeEvidence.mockResolvedValue({ evidenceId, incidentId });

    await call(
      evidenceRouter.remove,
      { evidenceId, incidentId },
      { context: context as never },
    );

    expect(evidenceMocks.removeEvidence).toHaveBeenCalledWith(
      evidenceId,
      incidentId,
      "operator-id",
    );
  });
});
