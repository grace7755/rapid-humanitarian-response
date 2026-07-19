import type {
  EvidenceRelationship,
  EvidenceSourceCategory,
  OccurrencePrecision,
  RiskFlags,
} from "../incidents/types.js";

export type ScoreBreakdownEntry = {
  key: string;
  label: string;
  points: number;
};

export type ConfidenceEvidence = {
  id: string;
  isIndependent: boolean;
  relationship: EvidenceRelationship;
  sourceCategory: EvidenceSourceCategory;
};

export type ConfidenceInput = {
  district: string | null;
  evidence: readonly ConfidenceEvidence[];
  locationText: string | null;
  occurredAt: Date | string | null;
  occurredAtPrecision: OccurrencePrecision;
};

export type ConfidenceLabel = "Unverified" | "Needs Review" | "Corroborated";

export type ConfidenceResult = {
  breakdown: ScoreBreakdownEntry[];
  hasCredibleContradiction: boolean;
  hasQualifyingSupportingSource: boolean;
  hasSupportingEvidence: boolean;
  label: ConfidenceLabel;
  score: number;
};

export type UrgencyLabel = "Low" | "Medium" | "High" | "Critical";

export type UrgencyResult = {
  breakdown: ScoreBreakdownEntry[];
  label: UrgencyLabel;
  score: number;
};

export type UrgencyInput = {
  riskFlags: RiskFlags;
};
