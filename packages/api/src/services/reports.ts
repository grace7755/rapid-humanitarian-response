import type {
  CreateRawIncidentInput,
  PublicIncidentReceipt,
} from "@my-better-t-app/db/queries/incidents";
import { ORPCError } from "@orpc/server";

import {
  type PublicReportInput,
  rawReportSnapshotSchema,
} from "../domain/reports/schema";

type ReportCreationDependencies = {
  persistRawReport: (
    input: CreateRawIncidentInput,
  ) => Promise<PublicIncidentReceipt>;
  verifyToken: (token: string) => Promise<boolean>;
};

export async function createPublicReport(
  input: PublicReportInput,
  dependencies: ReportCreationDependencies,
) {
  const isHuman = await dependencies.verifyToken(input.turnstileToken);
  if (!isHuman) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Verification failed or expired. Please try again.",
    });
  }

  const rawReport = rawReportSnapshotSchema.parse({
    affectedEstimate: input.affectedEstimate,
    country: "Bangladesh",
    description: input.description,
    district: input.district,
    division: "Chattogram",
    incidentType: input.incidentType,
    locationDescription: input.locationDescription,
    needs: input.needs,
    sourceUrl: input.sourceUrl,
    timeDescription: input.timeDescription,
  });

  try {
    return await dependencies.persistRawReport({
      rawReport: JSON.stringify(rawReport),
      sourceType: "community",
      sourceUrl: input.sourceUrl ?? null,
    });
  } catch {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "The report could not be saved. Please try again.",
    });
  }
}
