export const PILOT_COUNTRY = "Bangladesh" as const;
export const PILOT_DIVISION = "Chattogram" as const;

export const PILOT_DISTRICTS = [
  "Cox's Bazar",
  "Chattogram",
  "Bandarban",
  "Rangamati",
  "Khagrachhari",
  "Feni",
  "Noakhali",
  "Lakshmipur",
  "Cumilla",
  "Chandpur",
  "Brahmanbaria",
  "Other or Unknown",
] as const;

export const INCIDENT_SOURCE_TYPES = [
  "community",
  "manual",
  "reliefweb",
] as const;

export const INCIDENT_TYPES = [
  "flood",
  "landslide",
  "cyclone",
  "fire",
  "earthquake",
  "displacement",
  "food_insecurity",
  "water_shortage",
  "medical_access",
  "other",
] as const;

export const INCIDENT_NEEDS = [
  "rescue",
  "shelter",
  "food",
  "water",
  "medical",
  "sanitation",
  "protection",
  "transport",
  "information",
  "other",
] as const;

export const RISK_FLAG_KEYS = [
  "peopleTrapped",
  "noSafeWater",
  "noFood",
  "urgentMedicalNeed",
  "displacement",
  "vulnerableGroupsReported",
  "accessBlocked",
] as const;

export const OCCURRENCE_PRECISIONS = [
  "exact",
  "approximate",
  "unknown",
] as const;

export const EVIDENCE_SOURCE_CATEGORIES = [
  "official_authority",
  "established_humanitarian",
  "established_news",
  "local_news",
  "community_eyewitness",
  "unknown",
] as const;

export const EVIDENCE_RELATIONSHIPS = [
  "supports",
  "contradicts",
  "context",
] as const;

export const ORGANIZATION_SECTORS = [
  "search_and_rescue",
  "emergency_response",
  "shelter",
  "camp_management",
  "food_assistance",
  "nutrition",
  "water_sanitation_hygiene",
  "health",
  "emergency_medical_support",
  "protection",
  "logistics",
  "emergency_transport",
  "information_management",
  "community_communication",
  "other",
] as const;

export const ORGANIZATION_TYPES = [
  "community_group",
  "local_ngo",
  "national_ngo",
  "international_ngo",
  "un_agency",
  "government",
  "other",
] as const;

export const ORGANIZATION_REVIEW_STATUSES = [
  "reviewed",
  "needs_review",
  "do_not_contact",
] as const;

export const EXTRACTION_STATUSES = ["pending", "complete", "failed"] as const;

export const CASE_STATES = [
  "submitted",
  "reviewing",
  "corroborated",
  "outreach_ready",
  "contact_attempted",
  "closed",
  "rejected",
] as const;

export const OUTREACH_STATUSES = [
  "draft",
  "copied",
  "mailto_opened",
  "contact_attempted",
] as const;

export const AUDIT_EVENT_NAMES = [
  "report.created",
  "extraction.started",
  "extraction.completed",
  "extraction.failed",
  "incident.edited",
  "incident.review_started",
  "incident.facts_approved",
  "evidence.added",
  "evidence.removed",
  "scores.calculated",
  "matches.generated",
  "outreach.generated",
  "outreach.subject_copied",
  "outreach.body_copied",
  "outreach.mailto_opened",
  "outreach.contact_attempt_confirmed",
  "incident.state_changed",
] as const;

export const INCIDENT_REFERENCE_PREFIX = "RHR" as const;
