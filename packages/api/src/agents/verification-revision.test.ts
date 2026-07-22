import { beforeEach, describe, expect, it, vi } from "vitest";

// Only the database client is mocked so the real query function runs. This guards the
// atomicity fix: the revision bump and its six-hour expiry job must be written in one
// statement, so a revision can never exist without the job that expires it.
const dbMocks = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@my-better-t-app/db", () => ({
  db: { execute: dbMocks.execute },
  neonSql: vi.fn(),
}));
vi.mock("@my-better-t-app/env/server", () => ({ env: {} }));

import { startAutonomousVerification } from "@my-better-t-app/db/queries/incidents";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";

// Drizzle's sql`` template stores a mix of raw string chunks and parameter objects.
function executedSql() {
  const query = dbMocks.execute.mock.calls[0]?.[0];
  const chunks: unknown[] = query?.queryChunks ?? [];
  return chunks
    .map((chunk) => {
      if (typeof chunk === "string") return chunk;
      if (chunk && typeof chunk === "object" && "value" in chunk) {
        return String((chunk as { value: unknown }).value ?? "");
      }
      return "";
    })
    .join(" ")
    .toLowerCase();
}

describe("startAutonomousVerification atomicity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.execute.mockResolvedValue({
      rows: [{ id: incidentId, revision: 1 }],
    });
  });

  it("bumps the revision and enqueues the expiry job in a single statement", async () => {
    await startAutonomousVerification(incidentId);

    expect(dbMocks.execute).toHaveBeenCalledTimes(1);
    const statement = executedSql();
    expect(statement).toContain(
      "verification_revision = verification_revision + 1",
    );
    expect(statement).toContain("insert into workflow_jobs");
    expect(statement).toContain("verification_expiry:");
    expect(statement).toContain("interval '6 hours'");
    // The job must not be claimable before the revision actually expires.
    expect(statement).toContain("available_at");
  });

  it("returns the new revision for idempotent downstream job keys", async () => {
    dbMocks.execute.mockResolvedValue({
      rows: [{ id: incidentId, revision: "3" }],
    });

    await expect(startAutonomousVerification(incidentId)).resolves.toEqual({
      id: incidentId,
      revision: 3,
    });
  });

  it("returns null when the incident does not exist", async () => {
    dbMocks.execute.mockResolvedValue({ rows: [] });

    await expect(startAutonomousVerification(incidentId)).resolves.toBeNull();
  });

  it("rejects an unusable revision rather than emitting a malformed job key", async () => {
    dbMocks.execute.mockResolvedValue({
      rows: [{ id: incidentId, revision: "not-a-number" }],
    });

    await expect(startAutonomousVerification(incidentId)).rejects.toThrow(
      "VERIFICATION_REVISION_INVALID",
    );
  });
});
