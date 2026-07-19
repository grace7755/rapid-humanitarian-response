import type { AppRouterClient } from "@my-better-t-app/api/routers/index";
import { Card, CardContent } from "@my-better-t-app/ui/components/card";

type MatchRecord = Awaited<
  ReturnType<AppRouterClient["operator"]["match"]["list"]>
>[number];

export default function OrganizationMatchCard({
  match,
}: {
  match: MatchRecord;
}) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground">Match score</p>
            <p className="font-semibold text-2xl tabular-nums">
              {match.score}/100
            </p>
          </div>
          {match.isDemo ? (
            <span className="rounded-full border px-3 py-1 font-semibold text-xs">
              Demo record
            </span>
          ) : null}
        </div>
        <div>
          <h3 className="font-semibold text-lg">{match.organizationName}</h3>
          <a
            className="inline-flex min-h-11 items-center break-all text-primary underline underline-offset-4"
            href={match.organizationWebsite}
            rel="noreferrer"
            target="_blank"
          >
            Organization website
          </a>
        </div>
        <dl className="space-y-2">
          <div>
            <dt className="font-medium">Contact</dt>
            <dd className="text-muted-foreground">
              {match.contactEmail
                ? "Public contact email present"
                : "No public contact email listed"}
            </dd>
          </div>
          <div>
            <dt className="font-medium">Availability</dt>
            <dd className="text-muted-foreground">{match.availability}</dd>
          </div>
        </dl>
        <div>
          <p className="font-medium">Why it matched</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            {match.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
        <p className="border-t pt-3 text-muted-foreground text-xs leading-5">
          A match does not mean this organization is available or able to
          respond.
        </p>
      </CardContent>
    </Card>
  );
}
