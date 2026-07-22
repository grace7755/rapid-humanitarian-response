import type { AppRouterClient } from "@my-better-t-app/api/routers/index";

import ScoreBadge from "@/components/score-badge";
import StatusBadge from "@/components/status-badge";

type IncidentDetail = Awaited<
  ReturnType<AppRouterClient["observer"]["incident"]["get"]>
>;

function stateDescription(state: string) {
  const descriptions: Record<string, string> = {
    closed: "The autonomous case lifecycle is closed.",
    contradicted: "A credible contradiction blocked escalation.",
    corroborated:
      "Strict verifier consensus passed and partner matching is queued.",
    escalation_ready:
      "Eligible partners were matched and notifications are queued.",
    inconclusive: "The six-hour evidence window ended without strict quorum.",
    notified: "At least one opted-in partner notification was sent.",
    submitted: "The report is waiting for classification.",
    verifying:
      "Independent verifier agents are cross-checking current evidence.",
  };
  return descriptions[state] ?? "Autonomous processing is in progress.";
}

export default function IncidentStatus({
  incident,
}: {
  incident: IncidentDetail;
}) {
  return (
    <aside className="space-y-5 rounded-xl border bg-card p-5 lg:sticky lg:top-4">
      <div>
        <p className="font-medium text-muted-foreground text-sm">
          Autonomous state
        </p>
        <StatusBadge className="mt-2 capitalize" status={incident.state} />
        <p className="mt-3 text-muted-foreground text-sm leading-6">
          {stateDescription(incident.state)}
        </p>
      </div>
      <dl className="space-y-4 border-t pt-4 text-sm">
        <div>
          <dt className="font-medium">Verification</dt>
          <dd className="mt-1 text-muted-foreground capitalize">
            {incident.verificationStatus.replaceAll("_", " ")}
          </dd>
        </div>
        <div>
          <dt className="font-medium">Revision</dt>
          <dd className="mt-1 text-muted-foreground">
            {incident.verificationRevision}
          </dd>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScoreBadge label="Confidence" score={incident.confidenceScore} />
          <ScoreBadge label="Urgency" score={incident.urgencyScore} />
        </div>
      </dl>
      <p className="border-t pt-4 text-muted-foreground text-xs leading-5">
        This console is read-only. It cannot approve, edit, reject, or escalate
        an incident.
      </p>
    </aside>
  );
}
