import { evidenceCreateInputSchema } from "@my-better-t-app/api/domain/evidence/schema";
import {
  EVIDENCE_RELATIONSHIPS,
  EVIDENCE_SOURCE_CATEGORIES,
} from "@my-better-t-app/api/domain/incidents/constants";
import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";

import ErrorSummary from "@/components/error-summary";
import { orpc } from "@/utils/orpc";

function displayLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

const fieldIds: Record<string, string> = {
  isIndependent: "evidence-independent",
  note: "evidence-note",
  publishedAt: "evidence-published-at",
  relationship: "evidence-relationship",
  sourceCategory: "evidence-category",
  sourceName: "evidence-source-name",
  url: "evidence-url",
};

export default function EvidenceForm({ incidentId }: { incidentId: string }) {
  const queryClient = useQueryClient();
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const createEvidence = useMutation(
    orpc.operator.evidence.create.mutationOptions(),
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    const form = new FormData(event.currentTarget);
    const publishedAt = String(form.get("publishedAt") ?? "");
    const publishedAtDate = publishedAt ? new Date(publishedAt) : null;
    const parsed = evidenceCreateInputSchema.safeParse({
      incidentId,
      isIndependent: form.get("isIndependent") === "on",
      note: String(form.get("note") ?? "").trim() || null,
      publishedAt:
        publishedAtDate && !Number.isNaN(publishedAtDate.getTime())
          ? publishedAtDate.toISOString()
          : publishedAt || null,
      relationship: form.get("relationship"),
      sourceCategory: form.get("sourceCategory"),
      sourceName: form.get("sourceName"),
      url: form.get("url"),
    });

    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        next[String(issue.path[0] ?? "form")] ??= issue.message;
      }
      setErrors(next);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    try {
      await createEvidence.mutateAsync(parsed.data);
      event.currentTarget.reset();
      setErrors({});
      await queryClient.invalidateQueries();
    } catch {
      setSubmitError(
        "The evidence record could not be added. Verify the public URL and retry.",
      );
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
    }
  };

  const summaryErrors = [
    ...Object.entries(errors).map(([field, message]) => ({
      fieldId: fieldIds[field] ?? "evidence-submit",
      message,
    })),
    ...(submitError
      ? [{ fieldId: "evidence-submit", message: submitError }]
      : []),
  ];

  return (
    <form className="space-y-5" noValidate onSubmit={submit}>
      <ErrorSummary errors={summaryErrors} ref={errorSummaryRef} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="evidence-url">Public evidence URL</Label>
          <Input
            aria-invalid={Boolean(errors.url)}
            autoComplete="off"
            className="min-h-11 text-base"
            id="evidence-url"
            maxLength={2048}
            name="url"
            placeholder="https://…"
            required
            spellCheck={false}
            type="url"
          />
          {errors.url ? (
            <p className="text-destructive text-sm">{errors.url}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence-source-name">Source name</Label>
          <Input
            aria-invalid={Boolean(errors.sourceName)}
            autoComplete="off"
            className="min-h-11 text-base"
            id="evidence-source-name"
            maxLength={160}
            name="sourceName"
            required
          />
          {errors.sourceName ? (
            <p className="text-destructive text-sm">{errors.sourceName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence-published-at">
            Publication time (optional)
          </Label>
          <Input
            aria-invalid={Boolean(errors.publishedAt)}
            autoComplete="off"
            className="min-h-11 text-base"
            id="evidence-published-at"
            name="publishedAt"
            type="datetime-local"
          />
          {errors.publishedAt ? (
            <p className="text-destructive text-sm">{errors.publishedAt}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence-category">Source category</Label>
          <select
            aria-invalid={Boolean(errors.sourceCategory)}
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            defaultValue="unknown"
            id="evidence-category"
            name="sourceCategory"
          >
            {EVIDENCE_SOURCE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {displayLabel(category)}
              </option>
            ))}
          </select>
          {errors.sourceCategory ? (
            <p className="text-destructive text-sm">{errors.sourceCategory}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="evidence-relationship">Relationship</Label>
          <select
            aria-invalid={Boolean(errors.relationship)}
            autoComplete="off"
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            defaultValue="supports"
            id="evidence-relationship"
            name="relationship"
          >
            {EVIDENCE_RELATIONSHIPS.map((relationship) => (
              <option key={relationship} value={relationship}>
                {relationship === "context"
                  ? "Context Only"
                  : displayLabel(relationship)}
              </option>
            ))}
          </select>
          {errors.relationship ? (
            <p className="text-destructive text-sm">{errors.relationship}</p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="evidence-note">Operator note (optional)</Label>
          <Textarea
            aria-invalid={Boolean(errors.note)}
            autoComplete="off"
            className="min-h-24 text-base"
            id="evidence-note"
            maxLength={500}
            name="note"
          />
          {errors.note ? (
            <p className="text-destructive text-sm">{errors.note}</p>
          ) : null}
        </div>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3">
        <input
          className="mt-0.5 size-5 shrink-0"
          id="evidence-independent"
          name="isIndependent"
          type="checkbox"
        />
        <span>
          <span className="block font-medium">Independent original source</span>
          <span className="mt-1 block text-muted-foreground text-sm leading-6">
            Confirm only when this is not a copy, repost, syndication, or
            summary of another listed source. Distinct domains alone do not
            prove independence.
          </span>
        </span>
      </label>

      <Button
        className="min-h-11"
        disabled={createEvidence.isPending}
        id="evidence-submit"
        type="submit"
      >
        {createEvidence.isPending ? "Adding evidence…" : "Add evidence"}
      </Button>
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {createEvidence.isPending
          ? "Saving evidence. Stored scores will not change."
          : "Adding or removing evidence does not recalculate scores."}
      </p>
    </form>
  );
}
