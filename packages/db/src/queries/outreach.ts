import { asc, eq } from "drizzle-orm";

import { db } from "../index.js";
import { type NewOutreachDraft, outreachDrafts } from "../schema/index.js";

export type UpsertOutreachDraftInput = Omit<
  NewOutreachDraft,
  "createdAt" | "id" | "updatedAt"
>;

export async function upsertOutreachDraft(input: UpsertOutreachDraftInput) {
  const [draft] = await db
    .insert(outreachDrafts)
    .values(input)
    .onConflictDoUpdate({
      target: [outreachDrafts.incidentId, outreachDrafts.organizationId],
      set: {
        body: input.body,
        status: input.status,
        subject: input.subject,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: outreachDrafts.id,
      incidentId: outreachDrafts.incidentId,
      organizationId: outreachDrafts.organizationId,
      status: outreachDrafts.status,
      subject: outreachDrafts.subject,
      body: outreachDrafts.body,
      updatedAt: outreachDrafts.updatedAt,
    });

  return draft;
}

export async function listOutreachDraftsForIncident(incidentId: string) {
  return db
    .select({
      id: outreachDrafts.id,
      organizationId: outreachDrafts.organizationId,
      status: outreachDrafts.status,
      subject: outreachDrafts.subject,
      body: outreachDrafts.body,
      createdByUserId: outreachDrafts.createdByUserId,
      createdAt: outreachDrafts.createdAt,
      updatedAt: outreachDrafts.updatedAt,
    })
    .from(outreachDrafts)
    .where(eq(outreachDrafts.incidentId, incidentId))
    .orderBy(asc(outreachDrafts.createdAt));
}

export async function updateOutreachStatus(
  outreachDraftId: string,
  status: NonNullable<NewOutreachDraft["status"]>,
) {
  const [updated] = await db
    .update(outreachDrafts)
    .set({ status, updatedAt: new Date() })
    .where(eq(outreachDrafts.id, outreachDraftId))
    .returning({ id: outreachDrafts.id, status: outreachDrafts.status });

  return updated ?? null;
}
