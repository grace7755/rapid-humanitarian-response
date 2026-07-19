import { describe, expect, it, vi } from "vitest";

vi.mock("@my-better-t-app/db/queries/audit", () => ({
  insertAuditEvent: vi.fn(),
}));

import { auditMetadataSchema, auditRecordSchema } from "./audit";

describe("safe audit metadata", () => {
  it("accepts IDs, counts, scores, and state changes", () => {
    expect(
      auditRecordSchema.parse({
        eventType: "scores.calculated",
        incidentId: "5d218f2e-ceb8-4c63-b442-385b32328f0a",
        metadata: {
          confidenceScore: 70,
          urgencyScore: 90,
        },
      }),
    ).toMatchObject({
      eventType: "scores.calculated",
      metadata: { confidenceScore: 70, urgencyScore: 90 },
    });
  });

  it("accepts only a bounded changed-field summary for incident edits", () => {
    expect(
      auditRecordSchema.parse({
        actorUserId: "operator-id",
        eventType: "incident.edited",
        incidentId: "5d218f2e-ceb8-4c63-b442-385b32328f0a",
        metadata: {
          changedFields: "affectedEstimate,needs,title",
        },
      }),
    ).toMatchObject({
      metadata: { changedFields: "affectedEstimate,needs,title" },
    });
  });

  it("accepts only bounded score summaries for generated matches", () => {
    expect(
      auditRecordSchema.parse({
        actorUserId: "operator-id",
        eventType: "matches.generated",
        incidentId: "5d218f2e-ceb8-4c63-b442-385b32328f0a",
        metadata: {
          matchCount: 3,
          matchScores: [100, 85, 70],
        },
      }),
    ).toMatchObject({
      metadata: { matchCount: 3, matchScores: [100, 85, 70] },
    });
  });

  it.each(["rawReport", "outreachBody", "password", "session", "apiKey"])(
    "rejects the sensitive metadata key %s",
    (key) => {
      expect(() =>
        auditMetadataSchema.parse({
          [key]: "sensitive value",
        }),
      ).toThrow();
    },
  );
});
