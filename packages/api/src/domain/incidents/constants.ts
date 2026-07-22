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

export const AUTONOMOUS_CASE_STATES = [
  "submitted",
  "verifying",
  "corroborated",
  "escalation_ready",
  "notified",
  "inconclusive",
  "contradicted",
  "closed",
] as const;

export const VERIFICATION_STATUSES = [
  "pending",
  "corroborated",
  "inconclusive",
  "contradicted",
  "expired",
] as const;

export const CASE_STATES = AUTONOMOUS_CASE_STATES;

export const AUDIT_EVENT_NAMES = [
  "report.created",
  "extraction.started",
  "extraction.completed",
  "extraction.failed",
  "evidence.added",
  "verification.completed",
  "verification.expired",
  "scores.calculated",
  "matches.generated",
  "partner_notification.sent",
  "partner_notification.delivered",
  "partner_notification.failed",
  "incident.state_changed",
  "legacy.human_action",
] as const;
