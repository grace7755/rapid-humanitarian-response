# Rapid Humanitarian Response Platform

An open-source, AI-first disaster intelligence and humanitarian coordination platform for Bangladesh. It continuously combines community reports with approved public sources, uses independent verifier agents to cross-check incidents, and automatically emails relevant opted-in NGOs only after strict consensus.

## 999 versus this platform

Bangladesh **999** is the government emergency call service operated by Bangladesh Police. It is toll-free, available 24/7, and coordinates immediate police, fire, and ambulance support. See the [official Bangladesh Police 999 page](https://telecom-police.portal.gov.bd/pages/static-pages/695e3b0cc4774958d7b72321).

This platform is not a dispatch service and never calls 999. It adds a different layer:

- correlates fragmented reports and public feeds into shared incidents;
- verifies claims across official, humanitarian, news, and contradiction sources;
- gives responders an evidence-linked operating picture over time;
- matches corroborated needs to reviewed, consented NGO partners;
- sends structured, idempotent partner alerts without waiting for per-incident review.

People should call **999 for immediate danger**. Communities, responders, and NGOs use this platform in addition to 999 for wider situational awareness, cross-organization coordination, and needs that require sustained humanitarian action rather than immediate dispatch.

## Autonomous confidence gate

Three verifier roles run independently: official sources, humanitarian/news sources, and contradiction detection. Escalation requires all of the following:

- consensus confidence of at least 80;
- support from at least two verifier outputs;
- at least two independent publisher domains and source families;
- a usable location, incident type, and occurrence time;
- no credible contradiction.

If quorum is missing, jobs retry when new evidence arrives. After six hours the revision expires without sending an alert. The authenticated console is read-only; source approval, partner review, and partner consent are deployment governance, not incident decisions.

## Current capabilities

- Anonymous, non-identifying community report form.
- Monitoring connectors for ReliefWeb, USGS, FFWC JSON endpoints, and approved RSS/Atom feeds.
- Correlation, classification, three-way verification, consensus, urgency, and NGO matching agents.
- PostgreSQL work queue with leases, retries, stale-revision protection, and idempotency.
- Automatic partner email through Resend, with signed delivery webhooks.
- Read-only observer console for incidents, evidence, verdicts, matches, agent runs, and delivery status.
- Safety switches disabled by default. No automated calls, including to 999.

## Developer setup

Requirements: [Bun](https://bun.sh) and PostgreSQL (the project is configured for Neon).

```bash
git clone https://github.com/grace7755/rapid-humanitarian-response.git
cd rapid-humanitarian-response
bun install
```

Copy `apps/server/.env.example` to `apps/server/.env` and `apps/web/.env.example` to `apps/web/.env`. Important server variables:

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`
- `OBSERVER_EMAIL_ALLOWLIST` for authenticated read-only console access
- `CRON_SECRET`, `MONITORING_ENABLED`
- `AUTONOMOUS_ESCALATION_ENABLED`, `PARTNER_EMAIL_ENABLED`
- `RESEND_API_KEY`, `PARTNER_ALERT_FROM`, `RESEND_WEBHOOK_SECRET`
- `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `RELIEFWEB_APP_NAME`

Keep outbound behavior off during local development:

```env
MONITORING_ENABLED=false
AUTONOMOUS_ESCALATION_ENABLED=false
PARTNER_EMAIL_ENABLED=false
```

Prepare and run:

```bash
bun run db:migrate
bun run db:seed
bun run dev
```

The scheduler may call `GET /internal/cron/monitor` every 15 minutes with `Authorization: Bearer <CRON_SECRET>`. Community-report jobs can still be processed when external monitoring is disabled.

## Quality checks

```bash
bun run check:ci
bun run check-types
bun run test
bun run build
```

See [the agent architecture](docs/agent-platform.md), [contribution guidance](CONTRIBUTING.md), and [security policy](SECURITY.md).

Licensed under [Apache License 2.0](LICENSE).
