import { beforeEach, describe, expect, it, vi } from "vitest";

const incidentMocks = vi.hoisted(() => ({
  applyAgentClassification: vi.fn(),
  createAutomaticIncident: vi.fn(),
  findIncidentCorrelationCandidates: vi.fn(),
  findUniqueDistrictMention: vi.fn(),
  getIncidentForObserver: vi.fn(),
  recordCommunityReportCorrelation: vi.fn(),
  startAutonomousVerification: vi.fn(),
  updateIncidentAgentAssessment: vi.fn(),
}));
const monitoringMocks = vi.hoisted(() => ({
  getMonitoringSource: vi.fn(),
  getObservationForAgent: vi.fn(),
  insertSourceObservationAndEnqueueCorrelation: vi.fn(),
  linkObservationToIncident: vi.fn(),
  listObservationsForIncident: vi.fn(),
  updateMonitoringSourcePoll: vi.fn(),
}));
const workflowMocks = vi.hoisted(() => ({ enqueueWorkflowJob: vi.fn() }));
const evidenceMocks = vi.hoisted(() => ({
  addAgentEvidence: vi.fn(),
  listEvidenceForIncident: vi.fn(),
}));
const connectorMocks = vi.hoisted(() => ({
  createConnector: vi.fn(),
  hashObservation: vi.fn(),
}));

vi.mock("@my-better-t-app/db/queries/incidents", () => incidentMocks);
vi.mock("@my-better-t-app/db/queries/monitoring", () => monitoringMocks);
vi.mock("@my-better-t-app/db/queries/workflows", () => workflowMocks);
vi.mock("@my-better-t-app/db/queries/evidence", () => evidenceMocks);
vi.mock("@my-better-t-app/db/queries/verification", () => ({
  listVerificationVerdicts: vi.fn(),
  upsertVerificationVerdict: vi.fn(),
}));
vi.mock("@my-better-t-app/env/server", () => ({
  env: { RELIEFWEB_APP_NAME: undefined },
}));
vi.mock("./connectors.js", () => connectorMocks);

import {
  runClassificationAgent,
  runCorrelationAgent,
  runMonitoringAgent,
  runPriorityAgent,
} from "./pipeline";

const incidentId = "5d218f2e-ceb8-4c63-b442-385b32328f0a";
const observationId = "02d108b7-4cf9-4437-8689-97f3d2b8a254";
const sourceId = "39afbc15-c89a-4f60-956f-f006d0b59224";
const context = { jobId: crypto.randomUUID(), runId: crypto.randomUUID() };

describe("agent assessment revisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    evidenceMocks.listEvidenceForIncident.mockResolvedValue([]);
    workflowMocks.enqueueWorkflowJob.mockResolvedValue({ id: "job" });
    incidentMocks.startAutonomousVerification.mockResolvedValue({
      id: incidentId,
      revision: 1,
    });
  });

  it("marks a delayed priority write as skipped when approval blocks it", async () => {
    incidentMocks.getIncidentForObserver.mockResolvedValue({
      riskFlags: {
        accessBlocked: false,
        displacement: false,
        noFood: false,
        noSafeWater: false,
        peopleTrapped: false,
        urgentMedicalNeed: false,
        vulnerableGroupsReported: false,
      },
    });
    incidentMocks.updateIncidentAgentAssessment.mockResolvedValue(null);

    await expect(
      runPriorityAgent(context, { incidentId, revision: 1 }),
    ).resolves.toMatchObject({ skipped: true });
  });

  it("uses the observation as the verification revision", async () => {
    monitoringMocks.getObservationForAgent.mockResolvedValue({
      district: "Feni",
      division: "Chattogram",
      excerpt: "Flood water has entered homes",
      id: observationId,
      incidentTypeCandidate: "flood",
      publishedAt: new Date("2026-07-22T08:00:00.000Z"),
      restrictedPayload: {},
      title: "Flood in Feni",
    });
    incidentMocks.applyAgentClassification.mockResolvedValue({
      id: incidentId,
    });

    await runClassificationAgent(
      context,
      { incidentId, observationId },
      {
        generateStructured: vi
          .fn()
          .mockRejectedValue(new Error("MODEL_NOT_CONFIGURED")),
      },
    );

    expect(workflowMocks.enqueueWorkflowJob).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `verification_official:${incidentId}:1`,
      }),
    );
    expect(workflowMocks.enqueueWorkflowJob).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `verification_humanitarian_news:${incidentId}:1`,
      }),
    );
    expect(workflowMocks.enqueueWorkflowJob).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `verification_contradiction:${incidentId}:1`,
      }),
    );
    expect(workflowMocks.enqueueWorkflowJob).not.toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: `priority:${incidentId}` }),
    );
  });

  it("leaves expiry scheduling to startAutonomousVerification", async () => {
    monitoringMocks.getObservationForAgent.mockResolvedValue({
      district: "Feni",
      division: "Chattogram",
      excerpt: "Flood water has entered homes",
      id: observationId,
      incidentTypeCandidate: "flood",
      publishedAt: new Date("2026-07-22T08:00:00.000Z"),
      restrictedPayload: {},
      title: "Flood in Feni",
    });
    incidentMocks.applyAgentClassification.mockResolvedValue({
      id: incidentId,
    });

    await runClassificationAgent(
      context,
      { incidentId, observationId },
      {
        generateStructured: vi
          .fn()
          .mockRejectedValue(new Error("MODEL_NOT_CONFIGURED")),
      },
    );

    // The expiry job is written atomically with the revision bump, so a revision
    // cannot exist without it even when this agent later fails.
    expect(workflowMocks.enqueueWorkflowJob).not.toHaveBeenCalledWith(
      expect.objectContaining({
        idempotencyKey: `verification_expiry:${incidentId}:1`,
      }),
    );
  });

  it("correlates a community report before classification", async () => {
    monitoringMocks.getObservationForAgent.mockResolvedValue({
      canonicalUrl: null,
      connectorType: "community",
      district: null,
      division: null,
      excerpt: null,
      externalId: "RHR-REPORT-REFERENCE",
      id: observationId,
      incidentId: null,
      incidentTypeCandidate: "flood",
      publishedAt: null,
      restrictedPayload: { rawReport: "Flood reported in Feni" },
      sourceId: crypto.randomUUID(),
      sourceKey: "community-report",
      sourceName: "Community emergency reports",
      title: null,
      trustTier: "community",
    });
    incidentMocks.findUniqueDistrictMention.mockResolvedValue({
      district: "Feni",
      division: "Chattogram",
    });
    incidentMocks.findIncidentCorrelationCandidates.mockResolvedValue([
      { id: incidentId },
    ]);
    monitoringMocks.linkObservationToIncident.mockResolvedValue({
      id: observationId,
    });

    await runCorrelationAgent(context, { observationId });

    expect(monitoringMocks.linkObservationToIncident).toHaveBeenCalledWith(
      observationId,
      incidentId,
      { district: "Feni", division: "Chattogram" },
    );
    expect(incidentMocks.recordCommunityReportCorrelation).toHaveBeenCalledWith(
      incidentId,
      observationId,
    );
    expect(workflowMocks.enqueueWorkflowJob).toHaveBeenCalledWith({
      idempotencyKey: `classification:${incidentId}:${observationId}`,
      jobType: "classification",
      payload: { incidentId, observationId },
    });
  });

  it("lets the atomic persistence helper recover a duplicate observation job", async () => {
    incidentMocks.findUniqueDistrictMention.mockResolvedValue(null);
    monitoringMocks.getMonitoringSource.mockResolvedValue({
      cursor: null,
      enabled: true,
      endpoint: "https://example.test/feed",
      id: sourceId,
      connectorType: "reliefweb",
    });
    connectorMocks.createConnector.mockReturnValue({
      poll: vi.fn().mockResolvedValue({
        cursor: "next",
        observations: [
          {
            canonicalUrl: "https://example.test/report",
            district: "Feni",
            division: "Chattogram",
            excerpt: "Flood update",
            externalId: "external-report",
            incidentTypeCandidate: "flood",
            publishedAt: null,
            restrictedPayload: {},
            title: "Flood update",
          },
        ],
      }),
    });
    connectorMocks.hashObservation.mockResolvedValue("content-hash");
    monitoringMocks.insertSourceObservationAndEnqueueCorrelation.mockResolvedValue(
      { created: false, id: observationId },
    );

    const result = await runMonitoringAgent(context, { sourceId });

    expect(result).toMatchObject({ createdCount: 0, fetchedCount: 1 });
    expect(
      monitoringMocks.insertSourceObservationAndEnqueueCorrelation,
    ).toHaveBeenCalledOnce();
    expect(workflowMocks.enqueueWorkflowJob).not.toHaveBeenCalled();
  });
});
