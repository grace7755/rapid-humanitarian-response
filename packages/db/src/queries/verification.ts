import { and, asc, eq } from "drizzle-orm";

import { db } from "../index.js";
import {
  type NewVerificationVerdict,
  verificationVerdicts,
} from "../schema/index.js";

export async function upsertVerificationVerdict(
  input: Omit<NewVerificationVerdict, "createdAt" | "id">,
) {
  const [verdict] = await db
    .insert(verificationVerdicts)
    .values(input)
    .onConflictDoUpdate({
      target: [
        verificationVerdicts.incidentId,
        verificationVerdicts.revision,
        verificationVerdicts.verifierRole,
      ],
      set: {
        agentRunId: input.agentRunId,
        confidenceScore: input.confidenceScore,
        evidenceIds: input.evidenceIds,
        reasonCodes: input.reasonCodes,
        sourceDomains: input.sourceDomains,
        sourceFamilies: input.sourceFamilies,
        verdict: input.verdict,
      },
    })
    .returning();
  return verdict ?? null;
}

export async function listVerificationVerdicts(
  incidentId: string,
  revision: number,
) {
  return db
    .select()
    .from(verificationVerdicts)
    .where(
      and(
        eq(verificationVerdicts.incidentId, incidentId),
        eq(verificationVerdicts.revision, revision),
      ),
    )
    .orderBy(asc(verificationVerdicts.createdAt));
}
