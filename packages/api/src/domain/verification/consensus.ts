import type {
  EvidenceRelationship,
  EvidenceSourceCategory,
} from "../incidents/types.js";

export const VERIFIER_ROLES = [
  "official_sources",
  "humanitarian_news",
  "contradiction",
] as const;

export type VerifierRole = (typeof VERIFIER_ROLES)[number];
export type VerifierVerdict = "supports" | "contradicts" | "inconclusive";

export type VerificationEvidence = {
  id: string;
  isIndependent: boolean;
  publisherDomain: string;
  relationship: EvidenceRelationship;
  sourceCategory: EvidenceSourceCategory;
};

export type StoredVerifierVerdict = {
  role: VerifierRole;
  sourceDomains: string[];
  sourceFamilies: string[];
  verdict: VerifierVerdict;
};

const CREDIBLE_CATEGORIES = new Set<EvidenceSourceCategory>([
  "official_authority",
  "established_humanitarian",
  "established_news",
  "local_news",
]);

function sourceFamily(category: EvidenceSourceCategory) {
  if (category === "official_authority") return "official";
  if (category === "established_humanitarian") return "humanitarian";
  if (category === "established_news" || category === "local_news")
    return "news";
  return "community";
}

function evidenceForRole(
  role: VerifierRole,
  evidence: readonly VerificationEvidence[],
) {
  if (role === "official_sources") {
    return evidence.filter(
      (item) => item.sourceCategory === "official_authority",
    );
  }
  if (role === "humanitarian_news") {
    return evidence.filter((item) =>
      ["established_humanitarian", "established_news", "local_news"].includes(
        item.sourceCategory,
      ),
    );
  }
  return evidence;
}

export function evaluateVerifier(
  role: VerifierRole,
  evidence: readonly VerificationEvidence[],
): StoredVerifierVerdict {
  const scoped = evidenceForRole(role, evidence);
  const credibleContradiction = scoped.some(
    (item) =>
      item.relationship === "contradicts" &&
      CREDIBLE_CATEGORIES.has(item.sourceCategory),
  );
  const supporting = scoped.filter(
    (item) =>
      item.relationship === "supports" &&
      item.isIndependent &&
      CREDIBLE_CATEGORIES.has(item.sourceCategory),
  );
  const sourceDomains = [
    ...new Set(supporting.map((item) => item.publisherDomain)),
  ];
  const sourceFamilies = [
    ...new Set(supporting.map((item) => sourceFamily(item.sourceCategory))),
  ];

  let verdict: VerifierVerdict = "inconclusive";
  if (credibleContradiction) verdict = "contradicts";
  else if (role === "contradiction") {
    if (sourceDomains.length >= 2) verdict = "supports";
  } else if (supporting.length > 0) verdict = "supports";

  return { role, sourceDomains, sourceFamilies, verdict };
}

export type ConsensusInput = {
  confidenceScore: number;
  district: string | null;
  incidentType: string | null;
  locationText: string | null;
  occurredAt: Date | string | null;
  verdicts: readonly StoredVerifierVerdict[];
};

export type ConsensusResult = {
  passed: boolean;
  reasons: string[];
  status: "corroborated" | "contradicted" | "inconclusive";
};

export function evaluateConsensus(input: ConsensusInput): ConsensusResult {
  const reasons: string[] = [];
  const completedRoles = new Set(input.verdicts.map((item) => item.role));
  const supporting = input.verdicts.filter(
    (item) => item.verdict === "supports",
  );
  const domains = new Set(supporting.flatMap((item) => item.sourceDomains));
  const families = new Set(supporting.flatMap((item) => item.sourceFamilies));

  if (input.verdicts.some((item) => item.verdict === "contradicts")) {
    return {
      passed: false,
      reasons: ["credible-contradiction"],
      status: "contradicted",
    };
  }
  if (completedRoles.size !== VERIFIER_ROLES.length)
    reasons.push("verifiers-incomplete");
  if (supporting.length < 2) reasons.push("verifier-quorum");
  if (domains.size < 2) reasons.push("independent-domains");
  if (families.size < 2) reasons.push("independent-source-families");
  if (input.confidenceScore < 80) reasons.push("confidence-below-80");
  if (!input.district && !input.locationText?.trim())
    reasons.push("missing-location");
  if (!input.incidentType) reasons.push("missing-incident-type");
  if (!input.occurredAt) reasons.push("missing-occurrence-time");

  return {
    passed: reasons.length === 0,
    reasons,
    status: reasons.length === 0 ? "corroborated" : "inconclusive",
  };
}
