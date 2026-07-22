import { env } from "@my-better-t-app/env/web";
import { Button } from "@my-better-t-app/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Database, Network, Send, ShieldCheck } from "lucide-react";

import PrototypeBanner from "@/components/prototype-banner";

export const Route = createFileRoute("/")({ component: HomeRoute });

const steps = [
  {
    description:
      "Community reports and approved public feeds enter one incident stream.",
    icon: Database,
    title: "Collect",
  },
  {
    description:
      "Separate agents inspect official, humanitarian/news, and contradiction sources.",
    icon: Network,
    title: "Cross-check",
  },
  {
    description:
      "A strict consensus requires 80+ confidence, two independent domains and source families, and no credible contradiction.",
    icon: ShieldCheck,
    title: "Verify",
  },
  {
    description:
      "Corroborated incidents are matched to reviewed, opted-in partners and emailed automatically.",
    icon: Send,
    title: "Coordinate",
  },
] as const;

function HomeRoute() {
  return (
    <div className="overflow-y-auto">
      <PrototypeBanner />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="grid gap-8 border-b pb-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
          <div>
            <p className="mb-3 font-semibold text-primary text-sm uppercase tracking-wide">
              Bangladesh · autonomous disaster intelligence
            </p>
            <h1 className="max-w-4xl font-bold text-4xl tracking-tight sm:text-5xl lg:text-6xl">
              Verify emerging incidents and route them to the right
              partners—24/7.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground leading-8">
              Rapid Humanitarian Response correlates fragmented reports,
              cross-checks them with independent AI agents, and alerts vetted
              NGOs only after a strict confidence gate passes.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                className="min-h-11"
                render={<Link to="/report" />}
                size="lg"
              >
                Submit an incident report <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                className="min-h-11"
                render={<Link to="/sign-in" />}
                size="lg"
                variant="outline"
              >
                Observer sign in
              </Button>
            </div>
          </div>
          <aside className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-xl">For immediate danger</h2>
            <p className="mt-3 text-muted-foreground text-sm leading-6">
              Call Bangladesh&apos;s{" "}
              <strong className="text-foreground">999</strong> for immediate
              police, fire, or ambulance dispatch. This platform never calls 999
              and is not an emergency dispatch service.
            </p>
            <a
              className="mt-4 inline-flex min-h-11 items-center text-primary text-sm underline underline-offset-4"
              href="https://telecom-police.portal.gov.bd/pages/static-pages/695e3b0cc4774958d7b72321"
              rel="noreferrer"
              target="_blank"
            >
              Bangladesh Police 999 information
            </a>
          </aside>
        </section>

        <section aria-labelledby="how-it-works" className="py-12">
          <h2 className="font-bold text-3xl" id="how-it-works">
            Autonomous verification, not a single model guess
          </h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ description, icon: Icon, title }, index) => (
              <article className="rounded-xl border bg-card p-5" key={title}>
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="font-medium text-muted-foreground text-sm">
                    Step {index + 1}
                  </p>
                </div>
                <h3 className="mt-4 font-semibold text-xl">{title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-6">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="comparison" className="border-y py-12">
          <h2 className="font-bold text-3xl" id="comparison">
            999 and this platform solve different problems
          </h2>
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <article className="rounded-xl border bg-card p-6">
              <h3 className="font-semibold text-xl">Bangladesh 999</h3>
              <p className="mt-3 text-muted-foreground leading-7">
                A government emergency phone service operated by Bangladesh
                Police, available 24/7 and toll-free for immediate police, fire,
                and ambulance support.
              </p>
              <p className="mt-4 font-medium">
                Best for: a person who needs urgent dispatch now.
              </p>
            </article>
            <article className="rounded-xl border border-primary/30 bg-primary/5 p-6">
              <h3 className="font-semibold text-xl">
                Rapid Humanitarian Response
              </h3>
              <p className="mt-3 text-muted-foreground leading-7">
                An asynchronous intelligence and coordination layer that
                combines community reports with public feeds, detects matching
                incidents, verifies them across independent sources, and routes
                corroborated needs to opted-in NGOs.
              </p>
              <p className="mt-4 font-medium">
                Best for: wider situational awareness and sustained humanitarian
                coordination.
              </p>
            </article>
          </div>
        </section>

        <section className="py-12">
          <div className="grid gap-7 lg:grid-cols-3">
            <ValueBlock
              title="Pain points solved"
              items={[
                "Reports scattered across calls, websites, and feeds",
                "Slow manual cross-checking and duplicated incident records",
                "NGOs learning about needs late or without structured evidence",
              ]}
            />
            <ValueBlock
              title="Outcomes delivered"
              items={[
                "Continuous monitoring beyond call-centre interactions",
                "Evidence-linked confidence and contradiction records",
                "Faster, targeted alerts with location, needs, and provenance",
              ]}
            />
            <ValueBlock
              title="Why use both"
              items={[
                "Communities use 999 for urgent dispatch and this platform to surface broader needs",
                "Responders gain a corroborated operating picture",
                "NGOs receive relevant incidents without replacing public emergency services",
              ]}
            />
          </div>
        </section>

        <section className="rounded-2xl bg-muted p-6 sm:p-8">
          <h2 className="font-bold text-2xl">
            Designed for high-confidence autonomy
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground leading-7">
            No per-incident human approval exists. Contradictions veto
            escalation; missing quorum triggers retries and expires after six
            hours without sending an alert. The authenticated console is
            read-only, while partner consent and source governance remain
            deployment controls.
          </p>
          {env.VITE_GITHUB_URL ? (
            <a
              className="mt-5 inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4"
              href={env.VITE_GITHUB_URL}
              rel="noreferrer"
              target="_blank"
            >
              View the open-source project
            </a>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function ValueBlock({
  items,
  title,
}: {
  items: readonly string[];
  title: string;
}) {
  return (
    <article>
      <h2 className="font-semibold text-xl">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground text-sm leading-6">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
