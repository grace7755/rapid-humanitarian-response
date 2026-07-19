import type {
  ScoreBreakdownEntry,
  UrgencyInput,
  UrgencyLabel,
  UrgencyResult,
} from "./types.js";

const URGENCY_RULES = [
  {
    key: "peopleTrapped",
    label: "People trapped or immediate physical danger reported",
    points: 35,
  },
  {
    key: "urgentMedicalNeed",
    label: "Urgent medical access need reported",
    points: 25,
  },
  {
    key: "noSafeWater",
    label: "No safe drinking water reported",
    points: 20,
  },
  {
    key: "displacement",
    label: "Displacement or no shelter reported",
    points: 20,
  },
  { key: "noFood", label: "No food reported", points: 15 },
  {
    key: "vulnerableGroupsReported",
    label: "Vulnerable groups reported",
    points: 10,
  },
  {
    key: "accessBlocked",
    label: "Access or transport blocked",
    points: 10,
  },
] as const;

export function getUrgencyLabel(score: number): UrgencyLabel {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Medium";
  return "Low";
}

export function calculateUrgency(input: UrgencyInput): UrgencyResult {
  const breakdown: ScoreBreakdownEntry[] = URGENCY_RULES.filter(
    (rule) => input.riskFlags[rule.key],
  ).map(({ key, label, points }) => ({ key, label, points }));
  const score = Math.min(
    100,
    breakdown.reduce((total, entry) => total + entry.points, 0),
  );

  return {
    breakdown,
    label: getUrgencyLabel(score),
    score,
  };
}
