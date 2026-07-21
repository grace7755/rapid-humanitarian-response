import { call } from "@orpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const monitoringMocks = vi.hoisted(() => ({
  listMonitoringSources: vi.fn(),
  setMonitoringSourceEnabled: vi.fn(),
}));

vi.mock("@my-better-t-app/db/queries/monitoring", () => monitoringMocks);
vi.mock("@my-better-t-app/db/queries/workflows", () => ({
  listRecentAgentRuns: vi.fn(),
}));
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

import { monitoringRouter } from "./monitoring";

const sourceId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const context = {
  log: {},
  requestId: "test-request",
  session: { user: { email: "operator@example.org", id: "operator-id" } },
};

describe("monitoring source controls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects enabling a connector that has no implementation", async () => {
    monitoringMocks.listMonitoringSources.mockResolvedValue([
      {
        connectorType: "ffwc",
        enabled: false,
        endpoint: "https://api.ffwc.gov.bd/",
        id: sourceId,
        key: "ffwc-bangladesh",
        lastErrorCode: null,
        lastPolledAt: null,
        lastSuccessAt: null,
        name: "FFWC",
        trustTier: "official",
      },
    ]);

    await expect(
      call(
        monitoringRouter.setSourceEnabled,
        { enabled: true, sourceId },
        { context: context as never },
      ),
    ).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(monitoringMocks.setMonitoringSourceEnabled).not.toHaveBeenCalled();
  });
});
