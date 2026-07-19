import type {
  IncidentNeed,
  OrganizationReviewStatus,
  OrganizationSector,
} from "../incidents/types.js";
import { sectorsForNeeds } from "./sector-map.js";

export type MatchableOrganization = {
  areasServed: readonly string[];
  contactEmail: string | null;
  id: string;
  isDemo: boolean;
  name: string;
  reviewStatus: OrganizationReviewStatus;
  sectors: readonly OrganizationSector[];
};

export type MatchingIncident = {
  country: string;
  district: string | null;
  division: string;
  needs: readonly IncidentNeed[];
};

export type OrganizationMatch = {
  availability: "Unknown in Version 1";
  contactEmail: string | null;
  isDemo: boolean;
  organizationId: string;
  organizationName: string;
  reasons: string[];
  score: number;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en");
}

function hasArea(areas: readonly string[], area: string | null) {
  if (!area) return false;
  const target = normalize(area);
  return areas.some((value) => normalize(value) === target);
}

export function isSafeDemoContact(
  organization: Pick<MatchableOrganization, "contactEmail" | "isDemo">,
) {
  if (!organization.isDemo) return true;
  if (!organization.contactEmail) return false;
  const domain = organization.contactEmail.split("@").at(-1)?.toLowerCase();
  return domain === "example" || domain?.endsWith(".example") === true;
}

function scoreOrganization(
  incident: MatchingIncident,
  organization: MatchableOrganization,
): OrganizationMatch {
  const requiredSectors = sectorsForNeeds(incident.needs);
  const matchingSectors = requiredSectors.filter((sector) =>
    organization.sectors.includes(sector),
  );
  const reasons: string[] = [];
  let score = 0;

  if (matchingSectors.length > 0) {
    score += 40;
    reasons.push(
      `Relevant sector: ${matchingSectors[0]?.replaceAll("_", " ")}`,
    );
    const additionalMatches = Math.min(2, matchingSectors.length - 1);
    if (additionalMatches > 0) {
      score += additionalMatches * 10;
      reasons.push(
        `${additionalMatches} additional relevant sector${additionalMatches === 1 ? "" : "s"}`,
      );
    }
  }
  if (hasArea(organization.areasServed, incident.district)) {
    score += 25;
    reasons.push(`Serves ${incident.district}`);
  }
  if (hasArea(organization.areasServed, incident.division)) {
    score += 15;
    reasons.push(`Serves ${incident.division} Division`);
  }
  if (hasArea(organization.areasServed, incident.country)) {
    score += 10;
    reasons.push(`Serves ${incident.country}`);
  }
  if (organization.contactEmail) {
    score += 5;
    reasons.push("Public contact email is listed");
  }

  return {
    availability: "Unknown in Version 1",
    contactEmail: organization.contactEmail,
    isDemo: organization.isDemo,
    organizationId: organization.id,
    organizationName: organization.name,
    reasons,
    score: Math.min(100, score),
  };
}

export function matchOrganizations(
  incident: MatchingIncident,
  organizations: readonly MatchableOrganization[],
) {
  return organizations
    .filter(
      (organization) =>
        organization.reviewStatus === "reviewed" &&
        isSafeDemoContact(organization),
    )
    .map((organization) => scoreOrganization(incident, organization))
    .filter((match) => match.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.organizationName.localeCompare(right.organizationName, "en") ||
        left.organizationId.localeCompare(right.organizationId, "en"),
    )
    .slice(0, 3);
}
