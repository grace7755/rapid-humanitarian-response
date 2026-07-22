import {
  getIncidentForObserver,
  markIncidentEscalationReady,
} from "@my-better-t-app/db/queries/incidents";
import { replaceIncidentMatches } from "@my-better-t-app/db/queries/matches";
import { listReviewedOrganizationCandidates } from "@my-better-t-app/db/queries/organizations";
import { enqueueWorkflowJob } from "@my-better-t-app/db/queries/workflows";
import { z } from "zod";

import {
  INCIDENT_NEEDS,
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
} from "../domain/incidents/constants.js";
import { matchOrganizations } from "../domain/matching/match-organizations.js";
import type { AgentContext } from "./contracts.js";

const ngoMatchingJobSchema = z
  .object({
    incidentId: z.uuid(),
    revision: z.number().int().positive(),
  })
  .strict();

export async function runNgoMatchingAgent(
  _context: AgentContext,
  rawInput: Record<string, unknown>,
) {
  const input = ngoMatchingJobSchema.parse(rawInput);
  const [incident, candidates] = await Promise.all([
    getIncidentForObserver(input.incidentId),
    listReviewedOrganizationCandidates(),
  ]);
  if (!incident) throw new Error("INCIDENT_NOT_FOUND");

  if (
    incident.verificationRevision !== input.revision ||
    incident.verificationStatus !== "corroborated" ||
    incident.state !== "corroborated"
  ) {
    throw new Error("MATCHING_GATE_BLOCKED");
  }

  const matches = matchOrganizations(
    {
      country: incident.country,
      district: incident.district,
      division: incident.division,
      needs: z.array(z.enum(INCIDENT_NEEDS)).parse(incident.needs),
    },
    candidates
      .filter(
        (organization) =>
          organization.automationAllowed && Boolean(organization.contactEmail),
      )
      .map((organization) => ({
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
    null,
  );
  await markIncidentEscalationReady(input.incidentId, input.revision);
  for (const match of matches) {
    await enqueueWorkflowJob({
      idempotencyKey: `partner_notification:${input.incidentId}:${input.revision}:${match.organizationId}`,
      jobType: "partner_notification",
      payload: {
        incidentId: input.incidentId,
        organizationId: match.organizationId,
        revision: input.revision,
      },
    });
  }

  return {
    incidentId: input.incidentId,
    matchCount: matches.length,
    topScore: matches[0]?.score ?? null,
  };
}
