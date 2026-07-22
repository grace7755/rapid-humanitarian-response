import type { EvidenceSourceCategory } from "../incidents/types.js";
import type {
  ConfidenceInput,
  ConfidenceLabel,
  ConfidenceResult,
  ScoreBreakdownEntry,
} from "./types.js";

const EVIDENCE_BASE_VALUES = {
  community_eyewitness: 20,
  established_humanitarian: 60,
  established_news: 50,
  local_news: 40,
  official_authority: 70,
  unknown: 0,
} as const satisfies Record<EvidenceSourceCategory, number>;

const CREDIBLE_CONTRADICTION_CATEGORIES = new Set<EvidenceSourceCategory>([
  "official_authority",
  "established_humanitarian",
  "established_news",
  "local_news",
]);

function clampScore(score: number) {
  return Math.min(100, Math.max(0, score));
}

export function getConfidenceLabel(score: number): ConfidenceLabel {
  if (score >= 70) return "Corroborated";
  if (score >= 40) return "Needs Review";
  return "Unverified";
}

export function calculateConfidence(input: ConfidenceInput): ConfidenceResult {
  const supporting = input.evidence.filter(
    (item) => item.relationship === "supports",
  );
  const highestSupportingBase = supporting.reduce(
    (highest, item) =>
      Math.max(highest, EVIDENCE_BASE_VALUES[item.sourceCategory]),
    0,
  );
  const independentSupportingCount = supporting.filter(
    (item) => item.isIndependent,
  ).length;
  const hasCredibleContradiction = input.evidence.some(
    (item) =>
      item.relationship === "contradicts" &&
      CREDIBLE_CONTRADICTION_CATEGORIES.has(item.sourceCategory),
  );
  const hasMissingLocation =
    !input.district && !input.locationText?.trim().length;
  const hasMissingTime =
    input.occurredAt === null && input.occurredAtPrecision === "unknown";

  const breakdown: ScoreBreakdownEntry[] = [
    {
      key: "supporting-base",
      label:
        highestSupportingBase > 0
          ? "Highest-value supporting source"
          : "No valued supporting source",
      points: highestSupportingBase,
    },
  ];

  if (independentSupportingCount >= 2) {
    breakdown.push({
      key: "second-independent-source",
      label: "Second independently sourced supporting report",
      points: 20,
    });
  }
  if (independentSupportingCount >= 3) {
    breakdown.push({
      key: "third-independent-source",
      label: "Third independently sourced supporting report",
      points: 10,
    });
  }
  if (hasCredibleContradiction) {
    breakdown.push({
      key: "credible-contradiction",
      label: "Unresolved credible contradiction",
      points: -30,
    });
  }
  if (hasMissingLocation) {
    breakdown.push({
      key: "missing-location",
      label: "District and approximate location are missing",
      points: -10,
    });
  }
  if (hasMissingTime) {
    breakdown.push({
      key: "missing-time",
      label: "Occurrence time is missing and precision is unknown",
      points: -10,
    });
  }

  const score = clampScore(
    breakdown.reduce((total, entry) => total + entry.points, 0),
  );

  return {
    breakdown,
    hasCredibleContradiction,
    hasQualifyingSupportingSource: supporting.some(
      (item) => EVIDENCE_BASE_VALUES[item.sourceCategory] >= 40,
    ),
    hasSupportingEvidence: supporting.length > 0,
    label: getConfidenceLabel(score),
    score,
  };
}
