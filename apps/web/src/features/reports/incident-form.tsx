import {
  INCIDENT_NEEDS,
  INCIDENT_TYPES,
  PILOT_DISTRICTS,
} from "@my-better-t-app/api/domain/incidents/constants";
import { publicReportInputSchema } from "@my-better-t-app/api/domain/reports/schema";
import { env } from "@my-better-t-app/env/web";
import { Button } from "@my-better-t-app/ui/components/button";
import { Input } from "@my-better-t-app/ui/components/input";
import { Label } from "@my-better-t-app/ui/components/label";
import { Textarea } from "@my-better-t-app/ui/components/textarea";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  type FormEvent,
  useCallback,
  useRef,
  useState,
} from "react";

import ErrorSummary from "@/components/error-summary";
import { orpc } from "@/utils/orpc";

import TurnstileWidget from "./turnstile-widget";

type FormValues = {
  affectedEstimate: string;
  dataNoticeAccepted: boolean;
  description: string;
  district: string;
  incidentType: string;
  locationDescription: string;
  needs: string[];
  sourceUrl: string;
  timeDescription: string;
  turnstileToken: string;
  website: string;
};

const initialValues: FormValues = {
  affectedEstimate: "",
  dataNoticeAccepted: false,
  description: "",
  district: "",
  incidentType: "",
  locationDescription: "",
  needs: [],
  sourceUrl: "",
  timeDescription: "",
  turnstileToken: "",
  website: "",
};

function displayLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function IncidentForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement>(null);
  const reportMutation = useMutation(orpc.public.report.create.mutationOptions());

  const setValue = <Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) => {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const setTurnstileToken = useCallback((token: string) => {
    setValues((current) => ({ ...current, turnstileToken: token }));
  }, []);

  const focusErrors = () => {
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmissionError(null);

    const parsed = publicReportInputSchema.safeParse({
      affectedEstimate: values.affectedEstimate
        ? Number(values.affectedEstimate)
        : undefined,
      dataNoticeAccepted: values.dataNoticeAccepted,
      description: values.description,
      district: values.district,
      incidentType: values.incidentType,
      locationDescription: values.locationDescription,
      needs: values.needs,
      sourceUrl: values.sourceUrl.trim() || undefined,
      timeDescription: values.timeDescription,
      turnstileToken: values.turnstileToken,
      website: values.website,
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
      const receipt = await reportMutation.mutateAsync(parsed.data);
      await navigate({
        params: { reference: receipt.reference },
        to: "/report/success/$reference",
      });
    } catch {
      setSubmissionError(
        "The report could not be submitted. Your entries are still here; please retry.",
      );
      focusErrors();
    }
  };

  const summaryErrors = [
    ...Object.entries(fieldErrors).map(([fieldId, message]) => ({
      fieldId,
      message,
    })),
    ...(submissionError
      ? [{ fieldId: "submit-report", message: submissionError }]
      : []),
  ];

  return (
    <form className="space-y-6" noValidate onSubmit={submit}>
      <ErrorSummary errors={summaryErrors} ref={errorSummaryRef} />

      <fieldset className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
        <legend className="px-2 text-xl font-semibold">1. What happened</legend>

        <div className="space-y-2">
          <Label htmlFor="incidentType">Incident type (required)</Label>
          <select
            aria-invalid={Boolean(fieldErrors.incidentType)}
            className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
            id="incidentType"
            onChange={(event) => setValue("incidentType", event.target.value)}
            value={values.incidentType}
          >
            <option value="">Select an incident type</option>
            {INCIDENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {displayLabel(type)}
              </option>
            ))}
          </select>
          {fieldErrors.incidentType ? (
            <p className="text-sm text-destructive">{fieldErrors.incidentType}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Incident description (required)</Label>
          <p className="text-sm text-muted-foreground">
            Use 40–2,000 characters and describe only what was reported.
          </p>
          <Textarea
            aria-invalid={Boolean(fieldErrors.description)}
            className="min-h-36 text-base"
            id="description"
            maxLength={2000}
            onChange={(event) => setValue("description", event.target.value)}
            value={values.description}
          />
          <p className="text-sm text-muted-foreground">
            {values.description.length}/2,000 characters
          </p>
          {fieldErrors.description ? (
            <p className="text-sm text-destructive">{fieldErrors.description}</p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
        <legend className="px-2 text-xl font-semibold">2. Where and when</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="district">District or area (required)</Label>
            <select
              aria-invalid={Boolean(fieldErrors.district)}
              className="min-h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              id="district"
              onChange={(event) => setValue("district", event.target.value)}
              value={values.district}
            >
              <option value="">Select a district</option>
              {PILOT_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
            {fieldErrors.district ? (
              <p className="text-sm text-destructive">{fieldErrors.district}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeDescription">Time description (required)</Label>
            <Input
              aria-invalid={Boolean(fieldErrors.timeDescription)}
              className="min-h-11 text-base"
              id="timeDescription"
              onChange={(event) =>
                setValue("timeDescription", event.target.value)
              }
              placeholder="For example: this morning around 8am"
              value={values.timeDescription}
            />
            {fieldErrors.timeDescription ? (
              <p className="text-sm text-destructive">
                {fieldErrors.timeDescription}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="locationDescription">
            Approximate location (required)
          </Label>
          <Input
            aria-invalid={Boolean(fieldErrors.locationDescription)}
            className="min-h-11 text-base"
            id="locationDescription"
            onChange={(event) =>
              setValue("locationDescription", event.target.value)
            }
            placeholder="Use a landmark or broad area, not a household address"
            value={values.locationDescription}
          />
          {fieldErrors.locationDescription ? (
            <p className="text-sm text-destructive">
              {fieldErrors.locationDescription}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="affectedEstimate">
              Estimated affected population (optional)
            </Label>
            <Input
              aria-invalid={Boolean(fieldErrors.affectedEstimate)}
              className="min-h-11 text-base"
              id="affectedEstimate"
              inputMode="numeric"
              min="0"
              onChange={(event) =>
                setValue("affectedEstimate", event.target.value)
              }
              step="1"
              type="number"
              value={values.affectedEstimate}
            />
            {fieldErrors.affectedEstimate ? (
              <p className="text-sm text-destructive">
                {fieldErrors.affectedEstimate}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Public source URL (optional)</Label>
            <Input
              aria-invalid={Boolean(fieldErrors.sourceUrl)}
              className="min-h-11 text-base"
              id="sourceUrl"
              onChange={(event) => setValue("sourceUrl", event.target.value)}
              placeholder="https://"
              type="url"
              value={values.sourceUrl}
            />
            {fieldErrors.sourceUrl ? (
              <p className="text-sm text-destructive">{fieldErrors.sourceUrl}</p>
            ) : null}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
        <legend className="px-2 text-xl font-semibold">
          3. Needs and submission check
        </legend>

        <div className="space-y-3">
          <p className="font-medium">Reported needs (select at least one)</p>
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
          {fieldErrors.needs ? (
            <p className="text-sm text-destructive">{fieldErrors.needs}</p>
          ) : null}
        </div>

        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          Do not include names, identity documents, phone numbers, private
          medical details, faces, or exact household locations. Use an
          approximate area when possible.
        </div>

        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            aria-invalid={Boolean(fieldErrors.dataNoticeAccepted)}
            checked={values.dataNoticeAccepted}
            className="mt-1 size-5"
            id="dataNoticeAccepted"
            onChange={(event) =>
              setValue("dataNoticeAccepted", event.target.checked)
            }
            type="checkbox"
          />
          <span>
            I understand this is a coordination prototype and confirm that I
            have not included the personal data listed above. (required)
          </span>
        </label>
        {fieldErrors.dataNoticeAccepted ? (
          <p className="text-sm text-destructive">
            {fieldErrors.dataNoticeAccepted}
          </p>
        ) : null}

        <div
          aria-hidden="true"
          className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
        >
          <Label htmlFor="website">Website</Label>
          <Input
            autoComplete="off"
            id="website"
            onChange={(event) => setValue("website", event.target.value)}
            tabIndex={-1}
            value={values.website}
          />
        </div>

        {env.VITE_TURNSTILE_SITE_KEY ? (
          <div id="turnstileToken">
            <TurnstileWidget
              onTokenChange={setTurnstileToken}
              siteKey={env.VITE_TURNSTILE_SITE_KEY}
            />
            {fieldErrors.turnstileToken ? (
              <p className="mt-2 text-sm text-destructive">
                Complete the human verification before submitting.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-destructive" id="turnstileToken">
            Human verification is not configured. The report cannot be
            submitted.
          </p>
        )}

        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={reportMutation.isPending}
          id="submit-report"
          type="submit"
        >
          {reportMutation.isPending ? "Submitting report…" : "Submit report"}
        </Button>
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {reportMutation.isPending
            ? "Checking and securely storing your report."
            : "Submission does not guarantee contact, aid, or response."}
        </p>
      </fieldset>
    </form>
  );
}
