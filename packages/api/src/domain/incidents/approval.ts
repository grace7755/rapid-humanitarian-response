import { calculateConfidence } from "../scoring/confidence.js";
import type { ConfidenceInput, ConfidenceResult } from "../scoring/types.js";
import type { CaseState } from "./types.js";

export type GateCondition = {
  key: string;
  label: string;
  passed: boolean;
};

export type EvidenceGateResult = {
  conditions: GateCondition[];
  confidence: ConfidenceResult;
  passed: boolean;
};

export function evaluateEvidenceGate(
  input: ConfidenceInput,
): EvidenceGateResult {
  const confidence = calculateConfidence(input);
  const conditions: GateCondition[] = [
    {
      key: "supporting-evidence",
      label: "At least one evidence record supports the event",
      passed: confidence.hasSupportingEvidence,
    },
    {
      key: "confidence-threshold",
      label: "Recalculated confidence is at least 70",
      passed: confidence.score >= 70,
    },
    {
      key: "qualifying-source",
      label: "A supporting source has a base value of 40 or higher",
      passed: confidence.hasQualifyingSupportingSource,
    },
    {
      key: "no-credible-contradiction",
      label: "No unresolved credible contradiction exists",
      passed: !confidence.hasCredibleContradiction,
    },
  ];

  return {
    conditions,
    confidence,
    passed: conditions.every((condition) => condition.passed),
  };
}

export function evaluateFactApprovalGate(
  input: ConfidenceInput & {
    confirmation: boolean;
    factsApproved: boolean;
    state: CaseState;
  },
) {
  const evidenceGate = evaluateEvidenceGate(input);
  const conditions: GateCondition[] = [
    ...evidenceGate.conditions,
    {
      key: "reviewing-state",
      label: "The incident is in operator review",
      passed:
        input.state === "reviewing" ||
        (input.factsApproved && input.state === "corroborated"),
    },
    {
      key: "operator-confirmation",
      label: "Operator confirmed review against the listed evidence",
      passed: input.confirmation,
    },
  ];

  return {
    conditions,
    confidence: evidenceGate.confidence,
    passed: conditions.every((condition) => condition.passed),
  };
}

export function evaluateOutreachGate(
  input: ConfidenceInput & { factsApproved: boolean },
) {
  const evidenceGate = evaluateEvidenceGate(input);
  const conditions: GateCondition[] = [
    ...evidenceGate.conditions,
    {
      key: "facts-approved",
      label: "Facts are approved by an operator",
      passed: input.factsApproved,
    },
  ];

  return {
    conditions,
    confidence: evidenceGate.confidence,
    passed: conditions.every((condition) => condition.passed),
  };
}
