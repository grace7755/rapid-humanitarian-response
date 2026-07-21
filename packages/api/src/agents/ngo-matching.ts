import { listEvidenceForIncident } from "@my-better-t-app/db/queries/evidence";
import { getIncidentForOperator } from "@my-better-t-app/db/queries/incidents";
import { replaceIncidentMatches } from "@my-better-t-app/db/queries/matches";
import { listReviewedOrganizationCandidates } from "@my-better-t-app/db/queries/organizations";
import { z } from "zod";

import { evaluateOutreachGate } from "../domain/incidents/approval.js";
import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  INCIDENT_NEEDS,
  OCCURRENCE_PRECISIONS,
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
} from "../domain/incidents/constants.js";
import { matchOrganizations } from "../domain/matching/match-organizations.js";
import type { AgentContext } from "./contracts.js";

const ngoMatchingJobSchema = z
  .object({
    incidentId: z.uuid(),
    requestedByUserId: z.string().min(1),
  })
  .strict();

export async function runNgoMatchingAgent(
  _context: AgentContext,
  rawInput: Record<string, unknown>,
) {
  const input = ngoMatchingJobSchema.parse(rawInput);
  const [incident, evidence, candidates] = await Promise.all([
    getIncidentForOperator(input.incidentId),
    listEvidenceForIncident(input.incidentId),
    listReviewedOrganizationCandidates(),
  ]);
  if (!incident) throw new Error("INCIDENT_NOT_FOUND");

  const gate = evaluateOutreachGate({
    district: incident.district,
    evidence: evidence.map((item) => ({
      id: item.id,
      isIndependent: item.isIndependent,
      relationship: z.enum(EVIDENCE_RELATIONSHIPS).parse(item.relationship),
      sourceCategory: z
        .enum(EVIDENCE_SOURCE_CATEGORIES)
        .parse(item.sourceCategory),
    })),
    factsApproved: incident.factsApproved,
    locationText: incident.locationText,
    occurredAt: incident.occurredAt,
    occurredAtPrecision: z
      .enum(OCCURRENCE_PRECISIONS)
      .parse(incident.occurredAtPrecision),
  });
  if (!gate.passed) throw new Error("MATCHING_GATE_BLOCKED");

  const matches = matchOrganizations(
    {
      country: incident.country,
      district: incident.district,
      division: incident.division,
      needs: z.array(z.enum(INCIDENT_NEEDS)).parse(incident.needs),
    },
    candidates.map((organization) => ({
      areasServed: organization.areasServed,
      contactEmail: organization.contactEmail,
      id: organization.id,
      isDemo: organization.isDemo,
      name: organization.name,
      reviewStatus: z
        .enum(ORGANIZATION_REVIEW_STATUSES)
        .parse(organization.reviewStatus),
      sectors: z
        .array(z.enum(ORGANIZATION_SECTORS))
        .parse(organization.sectors),
    })),
  );

  await replaceIncidentMatches(
    input.incidentId,
    matches.map((match) => ({
      organizationId: match.organizationId,
      reasons: match.reasons,
      score: match.score,
    })),
    input.requestedByUserId,
  );

  return {
    incidentId: input.incidentId,
    matchCount: matches.length,
    topScore: matches[0]?.score ?? null,
  };
}
