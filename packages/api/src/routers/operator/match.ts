import { listEvidenceForIncident } from "@my-better-t-app/db/queries/evidence";
import { getIncidentForOperator } from "@my-better-t-app/db/queries/incidents";
import {
  listIncidentMatches,
  replaceIncidentMatches,
} from "@my-better-t-app/db/queries/matches";
import { listReviewedOrganizationCandidates } from "@my-better-t-app/db/queries/organizations";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { evaluateOutreachGate } from "../../domain/incidents/approval.js";
import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  INCIDENT_NEEDS,
  OCCURRENCE_PRECISIONS,
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
} from "../../domain/incidents/constants.js";
import {
  isSafeDemoContact,
  matchOrganizations,
  type OrganizationMatch,
} from "../../domain/matching/match-organizations.js";
import { operatorProcedure } from "../../index.js";

const matchRecordSchema = z
  .object({
    availability: z.literal("Unknown in Version 1"),
    contactEmail: z.email().nullable(),
    createdAt: z.string().nullable(),
    id: z.uuid().nullable(),
    isDemo: z.boolean(),
    organizationId: z.uuid(),
    organizationName: z.string(),
    organizationWebsite: z.url(),
    reasons: z.array(z.string()),
    reviewStatus: z.literal("reviewed"),
    score: z.number().int().min(0).max(100),
  })
  .strict();

const incidentIdInputSchema = z.object({ incidentId: z.uuid() }).strict();

async function serializeStoredMatches(incidentId: string) {
  const matches = await listIncidentMatches(incidentId);
  return matches
    .filter((match) => isSafeDemoContact(match))
    .map((match) =>
      matchRecordSchema.parse({
        availability: "Unknown in Version 1",
        contactEmail: match.contactEmail,
        createdAt: match.createdAt.toISOString(),
        id: match.id,
        isDemo: match.isDemo,
        organizationId: match.organizationId,
        organizationName: match.organizationName,
        organizationWebsite: match.organizationWebsite,
        reasons: match.reasons,
        reviewStatus: match.reviewStatus,
        score: match.score,
      }),
    );
}

export const matchRouter = {
  generate: operatorProcedure
    .input(incidentIdInputSchema)
    .output(z.array(matchRecordSchema))
    .handler(async ({ context, input }) => {
      const [incident, evidence, candidates] = await Promise.all([
        getIncidentForOperator(input.incidentId),
        listEvidenceForIncident(input.incidentId),
        listReviewedOrganizationCandidates(),
      ]);
      if (!incident) {
        throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
      }

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
      if (!gate.passed) {
        const failed = gate.conditions
          .filter((condition) => !condition.passed)
          .map((condition) => condition.label)
          .join("; ");
        throw new ORPCError("CONFLICT", {
          message: `Organization matching is blocked: ${failed}.`,
        });
      }

      const generated: OrganizationMatch[] = matchOrganizations(
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
        generated.map((match) => ({
          organizationId: match.organizationId,
          reasons: match.reasons,
          score: match.score,
        })),
        context.actor.id,
      );

      return serializeStoredMatches(input.incidentId);
    }),

  list: operatorProcedure
    .input(incidentIdInputSchema)
    .output(z.array(matchRecordSchema))
    .handler(async ({ input }) => {
      const incident = await getIncidentForOperator(input.incidentId);
      if (!incident) {
        throw new ORPCError("NOT_FOUND", { message: "Incident not found." });
      }
      return serializeStoredMatches(input.incidentId);
    }),
};
