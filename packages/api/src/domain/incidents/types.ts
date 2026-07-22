import type {
  CASE_STATES,
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  INCIDENT_NEEDS,
  OCCURRENCE_PRECISIONS,
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
  RISK_FLAG_KEYS,
} from "./constants.js";

type ArrayValue<T extends readonly unknown[]> = T[number];

export type IncidentNeed = ArrayValue<typeof INCIDENT_NEEDS>;
type RiskFlagKey = ArrayValue<typeof RISK_FLAG_KEYS>;
export type RiskFlags = Record<RiskFlagKey, boolean>;
export type OccurrencePrecision = ArrayValue<typeof OCCURRENCE_PRECISIONS>;
export type EvidenceSourceCategory = ArrayValue<
  typeof EVIDENCE_SOURCE_CATEGORIES
>;
export type EvidenceRelationship = ArrayValue<typeof EVIDENCE_RELATIONSHIPS>;
export type OrganizationSector = ArrayValue<typeof ORGANIZATION_SECTORS>;
export type OrganizationReviewStatus = ArrayValue<
  typeof ORGANIZATION_REVIEW_STATUSES
>;
export type CaseState = ArrayValue<typeof CASE_STATES>;
