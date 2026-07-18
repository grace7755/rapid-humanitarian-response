import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import { Button } from "@my-better-t-app/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import ScoreBadge from "@/components/score-badge";
import StatusBadge from "@/components/status-badge";
import { orpc } from "@/utils/orpc";

type IncidentDetail = Awaited<
  ReturnType<AppRouterClient["operator"]["incident"]["get"]>
>;

const nextStateOptions = {
  closed: [],
  contact_attempted: ["closed", "reviewing"],
  corroborated: ["outreach_ready", "reviewing"],
  outreach_ready: ["contact_attempted", "reviewing"],
  rejected: [],
  reviewing: ["corroborated", "rejected"],
  submitted: [],
} as const;

function currentAction(state: IncidentDetail["state"]) {
  switch (state) {
    case "submitted":
      return "Start review, compare the raw report with editable facts, and save corrections.";
    case "reviewing":
      return "Complete fact review. Evidence and score gates are added in the next workflow phase.";
    case "corroborated":
      return "Facts are marked corroborated. Organization matching is not yet available.";
    case "outreach_ready":
      return "Review the future outreach package before recording any manual contact.";
    case "contact_attempted":
      return "Close the triage case only when operator follow-up is complete.";
    case "closed":
      return "This triage case is closed; this does not mean the humanitarian issue was resolved.";
    case "rejected":
      return "This report was rejected from the operator workflow.";
  }
}

export default function IncidentStatus({
  incident,
}: {
  incident: IncidentDetail;
}) {
  const queryClient = useQueryClient();
  const [stateError, setStateError] = useState<string | null>(null);
  const startReview = useMutation(
    orpc.operator.incident.startReview.mutationOptions(),
  );
  const changeState = useMutation(
    orpc.operator.incident.changeState.mutationOptions(),
  );
  const isChanging = startReview.isPending || changeState.isPending;

  const refresh = async () => {
    await queryClient.invalidateQueries();
  };

  const handleStartReview = async () => {
    if (!window.confirm("Start operator review for this incident?")) return;
    setStateError(null);
    try {
      await startReview.mutateAsync({ incidentId: incident.id });
      await refresh();
    } catch {
      setStateError("Review could not be started. Reload and try again.");
    }
  };

  const handleChangeState = async (
    toState: (typeof nextStateOptions)[keyof typeof nextStateOptions][number],
  ) => {
    const label = toState.replaceAll("_", " ");
    if (
      !window.confirm(
        `Change this incident from ${incident.state.replaceAll("_", " ")} to ${label}?`,
      )
    ) {
      return;
    }
    setStateError(null);
    try {
      await changeState.mutateAsync({ incidentId: incident.id, toState });
      await refresh();
    } catch {
      setStateError("The state could not be changed. Reload and try again.");
    }
  };

  return (
    <aside className="space-y-5 rounded-xl border bg-card p-5 lg:sticky lg:top-4">
      <div>
        <p className="font-medium text-muted-foreground text-sm">Case state</p>
        <StatusBadge className="mt-2 capitalize" status={incident.state} />
      </div>

      <div className="flex flex-wrap gap-2">
        <ScoreBadge label="Urgency" score={incident.urgencyScore} />
        <ScoreBadge label="Confidence" score={incident.confidenceScore} />
      </div>

      <div>
        <p className="font-semibold text-sm">Current operator action</p>
        <p className="mt-2 text-muted-foreground text-sm leading-6">
          {currentAction(incident.state)}
        </p>
      </div>

      <div>
        <p className="font-medium text-muted-foreground text-sm">
          Extraction status
        </p>
        <StatusBadge
          className="mt-2 capitalize"
          label={`${incident.extractionStatus} — not verification`}
          status={incident.extractionStatus}
        />
      </div>

      {incident.state === "submitted" ? (
        <Button
          className="min-h-11 w-full"
          disabled={isChanging}
          onClick={handleStartReview}
        >
          {startReview.isPending ? "Starting review…" : "Start review"}
        </Button>
      ) : null}

      {nextStateOptions[incident.state].length > 0 ? (
        <div className="space-y-2 border-t pt-4">
          <p className="font-semibold text-sm">Change case state</p>
          {nextStateOptions[incident.state].map((state) => (
            <Button
              className="min-h-11 w-full capitalize"
              disabled={isChanging}
              key={state}
              onClick={() => handleChangeState(state)}
              variant={state === "rejected" ? "destructive" : "outline"}
            >
              Move to {state.replaceAll("_", " ")}
            </Button>
          ))}
        </div>
      ) : null}

      {stateError ? (
        <p className="text-destructive text-sm" role="alert">
          {stateError}
        </p>
      ) : null}
      <p aria-live="polite" className="text-muted-foreground text-sm">
        {isChanging ? "Updating incident state." : ""}
      </p>
    </aside>
  );
}
