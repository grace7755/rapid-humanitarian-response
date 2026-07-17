import { Button } from "@my-better-t-app/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ClipboardCheck, FileText } from "lucide-react";

import PrototypeBanner from "@/components/prototype-banner";

export const Route = createFileRoute("/")({
  component: HomeRoute,
});

const steps = [
  {
    description:
      "An anonymous reporter shares only approximate, non-identifying incident details.",
    icon: FileText,
    title: "Submit",
  },
  {
    description:
      "An allowlisted operator reviews editable facts and checks public evidence.",
    icon: ClipboardCheck,
    title: "Review",
  },
  {
    description:
      "The platform prepares a responder shortlist and editable manual contact package.",
    icon: CheckCircle2,
    title: "Prepare contact",
  },
] as const;

function HomeRoute() {
  return (
    <div className="overflow-y-auto">
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="grid gap-8 border-b pb-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">
              Bangladesh · Chattogram Division pilot
            </p>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Turn incident reports into safer coordination work.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Rapid Humanitarian Response helps trained operators structure
              anonymous reports, review public evidence, and prepare manual
              outreach. It does not verify truth or dispatch assistance.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                className="min-h-11"
                render={<Link to="/report" />}
                size="lg"
              >
                Submit an incident report
                <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                className="min-h-11"
                render={<Link to="/sign-in" />}
                size="lg"
                variant="outline"
              >
                Operator sign in
              </Button>
            </div>
          </div>

          <aside className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Pilot limits</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>English-language demonstration only.</li>
              <li>Covers Bangladesh reports in Chattogram Division.</li>
              <li>No names, phone numbers, media, or exact homes collected.</li>
              <li>All organization contact remains a manual operator action.</li>
            </ul>
          </aside>
        </section>

        <section className="py-12" aria-labelledby="how-it-works">
          <h2 className="text-3xl font-bold" id="how-it-works">
            How the prototype works
          </h2>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {steps.map(({ description, icon: Icon, title }, index) => (
              <article className="rounded-xl border bg-card p-5" key={title}>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="text-sm font-medium text-muted-foreground">
                    Step {index + 1}
                  </p>
                </div>
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-muted p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Built for careful review</h2>
          <p className="mt-3 max-w-3xl leading-7 text-muted-foreground">
            Confidence and urgency stay separate, automation cannot approve
            facts, and no contact is sent automatically. Review the approved
            roadmap and product contract for the complete safety boundaries.
          </p>
          <a
            className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
            href="/implementation_plan.md"
          >
            Read the implementation roadmap
          </a>
        </section>
      </main>
    </div>
  );
}
