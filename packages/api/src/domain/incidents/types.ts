import type {
  AUDIT_EVENT_NAMES,
  CASE_STATES,
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
  EXTRACTION_STATUSES,
  INCIDENT_NEEDS,
  INCIDENT_SOURCE_TYPES,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
  ORGANIZATION_REVIEW_STATUSES,
  ORGANIZATION_SECTORS,
  ORGANIZATION_TYPES,
  OUTREACH_STATUSES,
  PILOT_DISTRICTS,
  RISK_FLAG_KEYS,
} from "./constants.js";

type ArrayValue<T extends readonly unknown[]> = T[number];

export type IncidentSourceType = ArrayValue<typeof INCIDENT_SOURCE_TYPES>;
export type IncidentType = ArrayValue<typeof INCIDENT_TYPES>;
export type IncidentNeed = ArrayValue<typeof INCIDENT_NEEDS>;
export type RiskFlagKey = ArrayValue<typeof RISK_FLAG_KEYS>;
export type RiskFlags = Record<RiskFlagKey, boolean>;
export type OccurrencePrecision = ArrayValue<typeof OCCURRENCE_PRECISIONS>;
export type PilotDistrict = ArrayValue<typeof PILOT_DISTRICTS>;
export type EvidenceSourceCategory = ArrayValue<
  typeof EVIDENCE_SOURCE_CATEGORIES
>;
export type EvidenceRelationship = ArrayValue<typeof EVIDENCE_RELATIONSHIPS>;
export type OrganizationSector = ArrayValue<typeof ORGANIZATION_SECTORS>;
export type OrganizationType = ArrayValue<typeof ORGANIZATION_TYPES>;
export type OrganizationReviewStatus = ArrayValue<
  typeof ORGANIZATION_REVIEW_STATUSES
>;
export type ExtractionStatus = ArrayValue<typeof EXTRACTION_STATUSES>;
export type CaseState = ArrayValue<typeof CASE_STATES>;
export type OutreachStatus = ArrayValue<typeof OUTREACH_STATUSES>;
export type AuditEventName = ArrayValue<typeof AUDIT_EVENT_NAMES>;
