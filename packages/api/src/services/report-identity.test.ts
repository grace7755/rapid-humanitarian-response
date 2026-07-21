import { communityReportContentHash } from "@my-better-t-app/db/report-identity";
import { describe, expect, it } from "vitest";

describe("community report identity", () => {
  it("accepts identical report text as separate receipts", async () => {
    const rawReport = '{"description":"Flooded road"}';

    const first = await communityReportContentHash("RHR-FIRST", rawReport);
    const second = await communityReportContentHash("RHR-SECOND", rawReport);

    expect(first).not.toBe(second);
    expect(first).toBe(
      await communityReportContentHash("RHR-FIRST", rawReport),
    );
  });
});
