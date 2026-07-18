import { describe, expect, it, vi } from "vitest";

import { publicReportInputSchema } from "../../domain/reports/schema";
import { createPublicReport } from "../../services/reports";

const validInput = {
  affectedEstimate: 120,
  dataNoticeAccepted: true as const,
  description:
    "Flood water has entered several buildings and families report needing clean water.",
  district: "Cox's Bazar" as const,
  incidentType: "flood" as const,
  locationDescription: "Near the central market area",
  needs: ["water", "shelter"] as const,
  sourceUrl: "https://example.org/public-update",
  timeDescription: "This morning around 8am",
  turnstileToken: "valid-test-token",
  website: "",
};

describe("public report creation", () => {
  it("rejects invalid Turnstile verification without persisting", async () => {
    const persistRawReport = vi.fn();

    await expect(
      createPublicReport(publicReportInputSchema.parse(validInput), {
        persistRawReport,
        verifyToken: vi.fn().mockResolvedValue(false),
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(persistRawReport).not.toHaveBeenCalled();
  });

  it("persists the complete raw snapshot and returns only a receipt", async () => {
    const receipt = {
      reference: "RHR-0123456789ABCDEF0123456789ABCDEF",
      status: "received" as const,
    };
    const persistRawReport = vi.fn().mockResolvedValue(receipt);

    await expect(
      createPublicReport(publicReportInputSchema.parse(validInput), {
        persistRawReport,
        verifyToken: vi.fn().mockResolvedValue(true),
      }),
    ).resolves.toEqual(receipt);

    expect(persistRawReport).toHaveBeenCalledOnce();
    const persisted = persistRawReport.mock.calls[0]?.[0];
    expect(JSON.parse(persisted.rawReport)).toEqual({
      affectedEstimate: 120,
      country: "Bangladesh",
      description: validInput.description,
      district: "Cox's Bazar",
      division: "Chattogram",
      incidentType: "flood",
      locationDescription: validInput.locationDescription,
      needs: ["water", "shelter"],
      sourceUrl: validInput.sourceUrl,
      timeDescription: validInput.timeDescription,
    });
    expect(Object.keys(receipt).sort()).toEqual(["reference", "status"]);
  });

  it.each([
    { ...validInput, affectedEstimate: -1 },
    { ...validInput, description: "Too short" },
    { ...validInput, needs: [] },
    { ...validInput, sourceUrl: "file:///private/report" },
    { ...validInput, website: "bot-filled" },
  ])("rejects invalid report input", (input) => {
    expect(publicReportInputSchema.safeParse(input).success).toBe(false);
  });

  it("does not return a reference when persistence fails", async () => {
    await expect(
      createPublicReport(publicReportInputSchema.parse(validInput), {
        persistRawReport: vi.fn().mockRejectedValue(new Error("database")),
        verifyToken: vi.fn().mockResolvedValue(true),
      }),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
