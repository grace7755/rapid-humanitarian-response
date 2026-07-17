import {
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  OCCURRENCE_PRECISIONS,
  PILOT_DISTRICTS,
  RISK_FLAG_KEYS,
} from "@my-better-t-app/api/domain/incidents/constants";
import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

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

function makeInitialValues(incident: IncidentDetail): ReviewFormValues {
  return {
    affectedEstimate: incident.affectedEstimate?.toString() ?? "",
    district: incident.district ?? "",
    incidentType: incident.incidentType ?? "",
    locationText: incident.locationText ?? "",
    needs: incident.needs,
    occurredAt: incident.occurredAt
      ? incident.occurredAt.slice(0, 16)
      : "",
    occurredAtPrecision: incident.occurredAtPrecision,
    riskFlags: incident.riskFlags,
    summary: incident.summary ?? "",
    title: incident.title ?? "",
    unknowns: incident.unknowns.join("\n"),
  };
}

export default function IncidentReviewForm({
  incident,
}: {
  incident: IncidentDetail;
}) {
  const queryClient = useQueryClient();
  const initialValues = makeInitialValues(incident);
  const [values, setValues] = useState(initialValues);
  const [saveError, setSaveError] = useState<string | null>(null);
  const updateIncident = useMutation(
    orpc.operator.incident.update.mutationOptions(),
  );
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);

  const setValue = <Key extends keyof ReviewFormValues>(
    key: Key,
    value: ReviewFormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaveError(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveError(null);

    try {
      await updateIncident.mutateAsync({
        incidentId: incident.id,
        values: {
          affectedEstimate: values.affectedEstimate
            ? Number(values.affectedEstimate)
            : null,
          district: values.district
            ? (values.district as IncidentDetail["district"])
            : null,
          incidentType: values.incidentType
            ? (values.incidentType as IncidentDetail["incidentType"])
            : null,
          locationText: values.locationText.trim() || null,
          needs: values.needs as IncidentDetail["needs"],
          occurredAt: values.occurredAt
            ? new Date(values.occurredAt).toISOString()
            : null,
          occurredAtPrecision: values.occurredAtPrecision,
          riskFlags: values.riskFlags,
          summary: values.summary.trim() || null,
          title: values.title.trim() || null,
          unknowns: values.unknowns
            .split("\n")
            .map((value) => value.trim())
            .filter(Boolean),
        },
      });
      await queryClient.invalidateQueries();
    } catch {
      setSaveError(
        "The reviewed facts could not be saved. Check the fields and retry.",
      );
    }
  };

  return (
    <form className="space-y-6" onSubmit={save}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-title">Reviewed title</Label>
          <Input
            className="min-h-11 text-base"
            id="review-title"
            maxLength={160}
            onChange={(event) => setValue("title", event.target.value)}
            placeholder="Five or more characters, or leave unknown"
            value={values.title}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-summary">Reviewed summary</Label>
          <Textarea
            className="min-h-28 text-base"
            id="review-summary"
            maxLength={1200}
            onChange={(event) => setValue("summary", event.target.value)}
            placeholder="Twenty or more characters, or leave unknown"
            value={values.summary}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-type">Incident type</Label>
          <select
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-district">District</Label>
          <select
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
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="review-location">Approximate location</Label>
          <Input
            className="min-h-11 text-base"
            id="review-location"
            maxLength={200}
            onChange={(event) => setValue("locationText", event.target.value)}
            value={values.locationText}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-time">Occurrence time</Label>
          <Input
            className="min-h-11 text-base"
            id="review-time"
            onChange={(event) => setValue("occurredAt", event.target.value)}
            type="datetime-local"
            value={values.occurredAt}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-precision">Time precision</Label>
          <select
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-affected">Affected estimate</Label>
          <Input
            className="min-h-11 text-base"
            id="review-affected"
            min="0"
            onChange={(event) =>
              setValue("affectedEstimate", event.target.value)
            }
            step="1"
            type="number"
            value={values.affectedEstimate}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="review-unknowns">Unknowns (one per line)</Label>
          <Textarea
            className="min-h-24 text-base"
            id="review-unknowns"
            onChange={(event) => setValue("unknowns", event.target.value)}
            value={values.unknowns}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="font-semibold">Reviewed needs</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {INCIDENT_NEEDS.map((need) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
              key={need}
            >
              <input
                checked={values.needs.includes(need)}
                className="size-5"
                onChange={(event) =>
                  setValue(
                    "needs",
                    event.target.checked
                      ? [...values.needs, need]
                      : values.needs.filter((value) => value !== need),
                  )
                }
                type="checkbox"
              />
              <span>{displayLabel(need)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold">Risk flags</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {RISK_FLAG_KEYS.map((flag) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2"
              key={flag}
            >
              <input
                checked={values.riskFlags[flag]}
                className="size-5"
                onChange={(event) =>
                  setValue("riskFlags", {
                    ...values.riskFlags,
                    [flag]: event.target.checked,
                  })
                }
                type="checkbox"
              />
              <span>{displayLabel(flag)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {saveError ? (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          className="min-h-11"
          disabled={!isDirty || updateIncident.isPending}
          type="submit"
        >
          {updateIncident.isPending
            ? "Saving reviewed facts…"
            : "Save reviewed facts"}
        </Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">
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
