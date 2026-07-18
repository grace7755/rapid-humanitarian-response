import {
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
  PILOT_DISTRICTS,
  RISK_FLAG_KEYS,
} from "@my-better-t-app/api/domain/incidents/constants";
import { reviewFieldsSchema } from "@my-better-t-app/api/domain/incidents/review";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";

import ErrorSummary from "@/components/error-summary";
import { orpc } from "@/utils/orpc";

type IncidentDetail = Awaited<
  ReturnType<AppRouterClient["operator"]["incident"]["get"]>
>;

type ReviewFormValues = {
  affectedEstimate: string;
  district: string;
  incidentType: string;
  locationText: string;
  needs: string[];
  occurredAt: string;
  occurredAtPrecision: IncidentDetail["occurredAtPrecision"];
  riskFlags: IncidentDetail["riskFlags"];
  summary: string;
  title: string;
  unknowns: string;
};

function displayLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toLocalDateTimeValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}

function makeInitialValues(incident: IncidentDetail): ReviewFormValues {
  return {
    affectedEstimate: incident.affectedEstimate?.toString() ?? "",
    district: incident.district ?? "",
    incidentType: incident.incidentType ?? "",
    locationText: incident.locationText ?? "",
    needs: incident.needs,
    occurredAt: toLocalDateTimeValue(incident.occurredAt),
    occurredAtPrecision: incident.occurredAtPrecision,
    riskFlags: incident.riskFlags,
    summary: incident.summary ?? "",
    title: incident.title ?? "",
    unknowns: incident.unknowns.join("\n"),
  };
}

const reviewFieldIds: Record<keyof ReviewFormValues, string> = {
  affectedEstimate: "review-affected",
  district: "review-district",
  incidentType: "review-type",
  locationText: "review-location",
  needs: "review-needs",
  occurredAt: "review-time",
  occurredAtPrecision: "review-precision",
  riskFlags: "review-risk-flags",
  summary: "review-summary",
  title: "review-title",
  unknowns: "review-unknowns",
};

export default function IncidentReviewForm({
  incident,
}: {
  incident: IncidentDetail;
}) {
  const queryClient = useQueryClient();
  const initialValues = makeInitialValues(incident);
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const updateIncident = useMutation(
    orpc.operator.incident.update.mutationOptions(),
  );
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  const setValue = <Key extends keyof ReviewFormValues>(
    key: Key,
    value: ReviewFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    setSaveError(null);
  };

  const focusErrors = () => {
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);

    const occurredAtDate = values.occurredAt
      ? new Date(values.occurredAt)
      : null;
    const parsed = reviewFieldsSchema.safeParse({
      affectedEstimate: values.affectedEstimate
        ? Number(values.affectedEstimate)
        : null,
      district: values.district || null,
      incidentType: values.incidentType || null,
      locationText: values.locationText.trim() || null,
      needs: values.needs,
      occurredAt:
        occurredAtDate && !Number.isNaN(occurredAtDate.getTime())
          ? occurredAtDate.toISOString()
          : values.occurredAt || null,
      occurredAtPrecision: values.occurredAtPrecision,
      riskFlags: values.riskFlags,
      summary: values.summary.trim() || null,
      title: values.title.trim() || null,
      unknowns: values.unknowns
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean),
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "form");
        nextErrors[field] ??= issue.message;
      }
      setFieldErrors(nextErrors);
      focusErrors();
      return;
    }

    try {
      await updateIncident.mutateAsync({
        incidentId: incident.id,
        values: parsed.data,
      });
      await queryClient.invalidateQueries();
    } catch {
      setSaveError(
        "The reviewed facts could not be saved. Check the fields and retry.",
      );
      focusErrors();
    }
  };

  const summaryErrors = [
    ...Object.entries(fieldErrors).map(([field, message]) => ({
      fieldId: reviewFieldIds[field as keyof ReviewFormValues] ?? "review-save",
      message,
    })),
    ...(saveError ? [{ fieldId: "review-save", message: saveError }] : []),
  ];

  return (
    <form className="space-y-6" noValidate onSubmit={save}>
      <ErrorSummary errors={summaryErrors} ref={errorSummaryRef} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-title">Reviewed title</Label>
          <Input
            aria-describedby={
              fieldErrors.title ? "review-title-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.title)}
            className="min-h-11 text-base"
            id="review-title"
            maxLength={160}
            onChange={(event) => setValue("title", event.target.value)}
            placeholder="Five or more characters, or leave unknown"
            value={values.title}
          />
          {fieldErrors.title ? (
            <p className="text-destructive text-sm" id="review-title-error">
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-summary">Reviewed summary</Label>
          <Textarea
            aria-describedby={
              fieldErrors.summary ? "review-summary-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.summary)}
            className="min-h-28 text-base"
            id="review-summary"
            maxLength={1200}
            onChange={(event) => setValue("summary", event.target.value)}
            placeholder="Twenty or more characters, or leave unknown"
            value={values.summary}
          />
          {fieldErrors.summary ? (
            <p className="text-destructive text-sm" id="review-summary-error">
              {fieldErrors.summary}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-type">Incident type</Label>
          <select
            aria-describedby={
              fieldErrors.incidentType ? "review-type-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.incidentType)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            id="review-type"
            onChange={(event) => setValue("incidentType", event.target.value)}
            value={values.incidentType}
          >
            <option value="">Unknown</option>
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {displayLabel(type)}
              </option>
            ))}
          </select>
          {fieldErrors.incidentType ? (
            <p className="text-destructive text-sm" id="review-type-error">
              {fieldErrors.incidentType}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-district">District</Label>
          <select
            aria-describedby={
              fieldErrors.district ? "review-district-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.district)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            id="review-district"
            onChange={(event) => setValue("district", event.target.value)}
            value={values.district}
          >
            <option value="">Unknown</option>
            {PILOT_DISTRICTS.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>
          {fieldErrors.district ? (
            <p className="text-destructive text-sm" id="review-district-error">
              {fieldErrors.district}
            </p>
          ) : null}
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-location">Approximate location</Label>
          <Input
            aria-describedby={
              fieldErrors.locationText ? "review-location-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.locationText)}
            className="min-h-11 text-base"
            id="review-location"
            maxLength={200}
            onChange={(event) => setValue("locationText", event.target.value)}
            value={values.locationText}
          />
          {fieldErrors.locationText ? (
            <p className="text-destructive text-sm" id="review-location-error">
              {fieldErrors.locationText}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-time">Occurrence time</Label>
          <Input
            aria-describedby={
              fieldErrors.occurredAt ? "review-time-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.occurredAt)}
            className="min-h-11 text-base"
            id="review-time"
            onChange={(event) => setValue("occurredAt", event.target.value)}
            type="datetime-local"
            value={values.occurredAt}
          />
          {fieldErrors.occurredAt ? (
            <p className="text-destructive text-sm" id="review-time-error">
              {fieldErrors.occurredAt}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-precision">Time precision</Label>
          <select
            aria-describedby={
              fieldErrors.occurredAtPrecision
                ? "review-precision-error"
                : undefined
            }
            aria-invalid={Boolean(fieldErrors.occurredAtPrecision)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            id="review-precision"
            onChange={(event) =>
              setValue(
                "occurredAtPrecision",
                event.target.value as IncidentDetail["occurredAtPrecision"],
              )
            }
            value={values.occurredAtPrecision}
          >
            {OCCURRENCE_PRECISIONS.map((precision) => (
              <option key={precision} value={precision}>
                {displayLabel(precision)}
              </option>
            ))}
          </select>
          {fieldErrors.occurredAtPrecision ? (
            <p className="text-destructive text-sm" id="review-precision-error">
              {fieldErrors.occurredAtPrecision}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-affected">Affected estimate</Label>
          <Input
            aria-describedby={
              fieldErrors.affectedEstimate ? "review-affected-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.affectedEstimate)}
            className="min-h-11 text-base"
            id="review-affected"
            max="2147483647"
            min="0"
            onChange={(event) =>
              setValue("affectedEstimate", event.target.value)
            }
            step="1"
            type="number"
            value={values.affectedEstimate}
          />
          {fieldErrors.affectedEstimate ? (
            <p className="text-destructive text-sm" id="review-affected-error">
              {fieldErrors.affectedEstimate}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-unknowns">Unknowns (one per line)</Label>
          <Textarea
            aria-describedby={
              fieldErrors.unknowns ? "review-unknowns-error" : undefined
            }
            aria-invalid={Boolean(fieldErrors.unknowns)}
            className="min-h-24 text-base"
            id="review-unknowns"
            onChange={(event) => setValue("unknowns", event.target.value)}
            value={values.unknowns}
          />
          {fieldErrors.unknowns ? (
            <p className="text-destructive text-sm" id="review-unknowns-error">
              {fieldErrors.unknowns}
            </p>
          ) : null}
        </div>
      </div>

      <fieldset
        aria-describedby={fieldErrors.needs ? "review-needs-error" : undefined}
        className="space-y-3"
      >
        <legend className="font-semibold" id="review-needs">
          Reviewed needs
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INCIDENT_NEEDS.map((need) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
              key={need}
            >
              <input
                checked={values.needs.includes(need)}
                className="size-5"
                name="review-needs"
                onChange={(event) =>
                  setValue(
                    "needs",
                    event.target.checked
                      ? [...values.needs, need]
                      : values.needs.filter((value) => value !== need),
                  )
                }
                type="checkbox"
                value={need}
              />
              <span>{displayLabel(need)}</span>
            </label>
          ))}
        </div>
        {fieldErrors.needs ? (
          <p className="text-destructive text-sm" id="review-needs-error">
            {fieldErrors.needs}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        aria-describedby={
          fieldErrors.riskFlags ? "review-risk-flags-error" : undefined
        }
        className="space-y-3"
      >
        <legend className="font-semibold" id="review-risk-flags">
          Risk flags
        </legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {RISK_FLAG_KEYS.map((flag) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
              key={flag}
            >
              <input
                checked={values.riskFlags[flag]}
                className="size-5"
                name="review-risk-flags"
                onChange={(event) =>
                  setValue("riskFlags", {
                    ...values.riskFlags,
                    [flag]: event.target.checked,
                  })
                }
                type="checkbox"
                value={flag}
              />
              <span>{displayLabel(flag)}</span>
            </label>
          ))}
        </div>
        {fieldErrors.riskFlags ? (
          <p className="text-destructive text-sm" id="review-risk-flags-error">
            {fieldErrors.riskFlags}
          </p>
        ) : null}
      </fieldset>

      {saveError ? (
        <p className="text-destructive text-sm" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="min-h-11"
          disabled={!isDirty || updateIncident.isPending}
          id="review-save"
          type="submit"
        >
          {updateIncident.isPending
            ? "Saving reviewed facts…"
            : "Save reviewed facts"}
        </Button>
        <p aria-live="polite" className="text-muted-foreground text-sm">
          {updateIncident.isPending
            ? "Saving."
            : isDirty
              ? "Unsaved changes."
              : "All displayed changes are saved."}
        </p>
      </div>
    </form>
  );
}
