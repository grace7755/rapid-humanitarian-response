# Rapid Humanitarian Response Platform

This is an open-source emergency-reporting project for Bangladesh.

It helps people collect reports, check evidence, rank urgent cases, and find
possible response groups. It does **not** replace Bangladesh emergency service
999. It does not promise that help will arrive.

## What does the app do?

Think of an AI agent as a small helper inside the app. Each helper has one job.

1. A person sends an emergency report.
2. Monitoring helpers collect reports from allowed public sources.
3. Other helpers group, classify, verify, and rank the incident.
4. A human operator checks the facts and evidence.
5. The app suggests reviewed organizations that may be able to help.

The app never lets AI approve facts. Contact actions need a human decision.
Calls to national emergency services, including 999, are manual-only.

## What is already built?

- A public emergency report form.
- A protected operator dashboard.
- Evidence, confidence, and urgency checks.
- Monitoring, correlation, classification, verification, priority, and NGO
  matching agents.
- A durable job queue with retries and dead-job tracking.
- Reviewed organization matching with clear reasons.
- A guarded Vapi voice adapter for future approved pilots.
- Safety switches that keep monitoring, outreach, and voice off by default.

Communication drafts, reporting summaries, more data sources, and wider voice
automation are good areas for future contributors.

## Safety rules

- Do not use this app as your only way to ask for emergency help.
- Do not add private medical records, identity papers, faces, or exact home
  locations.
- Do not add real organization contacts without reviewing a public source.
- Keep `LIVE_OUTREACH_ENABLED=false` and `VOICE_ENABLED=false` while testing.
- AI output is a suggestion. A trained person must check it.

Read [the agent architecture](docs/agent-platform.md) for the technical safety
rules.

## Five setup steps

### 1. Install Bun

Bun runs the project and installs its code packages.

```bash
bun --version
```

If this command fails, install Bun from <https://bun.sh>.

### 2. Download the project

Fork this repository on GitHub, or clone it:

```bash
git clone https://github.com/grace7755/rapid-humanitarian-response.git
cd rapid-humanitarian-response
bun install
```

### 3. Make your settings files

Copy these two example files:

```text
apps/server/.env.example  -> apps/server/.env
apps/web/.env.example     -> apps/web/.env
```

The `.env` files hold private settings. Git ignores them. Never upload them.

Required server settings:

- `DATABASE_URL`: the private address of your Neon PostgreSQL database.
- `BETTER_AUTH_SECRET`: a random secret with at least 32 characters.
- `BETTER_AUTH_URL`: `http://localhost:3000/api/auth` for local work.
- `CORS_ORIGIN`: `http://localhost:3001` for local work.
- `OPERATOR_EMAIL_ALLOWLIST`: email addresses allowed into the dashboard.

Required web settings:

- `VITE_SERVER_URL=http://localhost:3000`
- `VITE_TURNSTILE_SITE_KEY`: use a Cloudflare test key for local work.

OpenRouter, ReliefWeb, Vapi, and live monitoring settings are optional. Leave
their feature switches set to `false` until you understand their safety rules.

### 4. Prepare your database

A database is an organized place where the app saves information.

Create your own Neon database, put its URL in `apps/server/.env`, then run:

```bash
bun run db:migrate
bun run db:seed
```

The seed adds Bangladesh locations, disabled monitoring sources, and one fake
`.example` organization. It does not add a real responder.

### 5. Start the app

```bash
bun run dev
```

Open:

- Web app: <http://localhost:3001>
- API: <http://localhost:3000>

## Automatic monitoring

The protected endpoint `/internal/cron/monitor` runs queued agent work. Any
scheduler can call it every 15 minutes with this header:

```text
Authorization: Bearer YOUR_CRON_SECRET
```

External source polling happens only when `MONITORING_ENABLED=true`. Community
reports can still move through the queue while external monitoring is off.

## Useful commands

```bash
bun run dev                 # Start the web app and API
bun run check:ci            # Check code style without changing files
bun run check-types         # Check TypeScript
bun run test                # Run automated tests
bun run build               # Build all packages
bun run db:migrate          # Apply saved database migrations
bun run db:seed             # Add safe starter records
bun run db:studio           # Open the database viewer
```

## Project map

```text
apps/web/       pages and forms people see
apps/server/    the Hono web server
packages/api/   agents, rules, and protected API procedures
packages/auth/  sign-in and operator access
packages/db/    database tables, queries, migrations, and seed data
packages/env/   safe environment-variable checks
packages/ui/    shared screen components and styles
```

An API is a safe doorway that lets two parts of an app talk to each other.
This project uses oRPC for that doorway.

## Help improve the project

You can fork the repository and change it for your community. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). Please read [SECURITY.md](SECURITY.md)
before reporting a safety or privacy problem.

This project uses the [Apache License 2.0](LICENSE).
