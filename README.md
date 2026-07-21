# Rapid Humanitarian Response Platform

This is a free, open-source disaster response project for Bangladesh.

It helps people share emergency reports. It also helps trained people check
the reports and find groups that may be able to help.

## Important safety message

This app does **not** replace Bangladesh emergency service **999**.

If someone is in danger, call 999 or contact local emergency workers. Do not
wait for this app. The app cannot promise that help will arrive.

## How does it work?

Think of an AI agent as a small helper inside the app. Each helper has one job.

1. A person reports a flood, fire, cyclone, earthquake, landslide, or another
   emergency.
2. The app can also read approved public information sources.
3. Small helpers compare the information and look for matching reports.
4. They suggest the disaster type and how urgent it may be.
5. A human checks the facts and evidence.
6. After approval, the app suggests trusted help groups.

An NGO is a group that helps people but is not part of the government.

AI cannot approve an incident. A human must make important decisions.
Calls to emergency services, including 999, are always manual.

## What is already built?

- A public emergency report form.
- A private dashboard for approved workers.
- Helpers that monitor, group, classify, verify, and rank reports.
- Checks for evidence, confidence, and urgency.
- Suggestions for up to three reviewed help groups.
- A work queue that can retry failed jobs.
- Safe voice-call code for future approved tests.
- Safety switches that are off by default.

The app can check for new public information about every 15 minutes when a
builder turns monitoring on and connects a scheduler.

## What is not built yet?

These features can be added by future contributors:

- More approved information sources.
- Communication and summary helpers.
- Wider voice calling.
- Support for countries outside Bangladesh.

## Safety rules

- Never use this app as your only way to ask for help.
- Do not share private medical files, identity cards, faces, or exact home
  addresses.
- Check every organization and contact before using it.
- Keep live monitoring and calling off while testing.
- Treat every AI answer as a suggestion that a trained person must check.

More technical safety details are in
[the agent guide](docs/agent-platform.md).

---

## Setup for developers

The rest of this page explains how to run the project on a computer.

### 1. Install Bun

Bun installs and runs the project code.

```bash
bun --version
```

If this command fails, install Bun from <https://bun.sh>.

### 2. Download the project

A fork is your own copy of a GitHub project. You can fork this project or run:

```bash
git clone https://github.com/grace7755/rapid-humanitarian-response.git
cd rapid-humanitarian-response
bun install
```

### 3. Create settings files

Copy these example files:

```text
apps/server/.env.example  -> apps/server/.env
apps/web/.env.example     -> apps/web/.env
```

These `.env` files hold private settings. Git ignores them. Never upload them.

Main server settings:

- `DATABASE_URL`: the private address of your Neon database.
- `BETTER_AUTH_SECRET`: a random secret with at least 32 characters.
- `BETTER_AUTH_URL=http://localhost:3000/api/auth`
- `CORS_ORIGIN=http://localhost:3001`
- `OPERATOR_EMAIL_ALLOWLIST`: emails allowed to use the private dashboard.

Main web setting:

- `VITE_SERVER_URL=http://localhost:3000`

Turnstile is optional for local work but required for a production build.
OpenRouter, ReliefWeb, Vapi, and live monitoring are also optional.

Keep these switches off during normal testing:

```env
MONITORING_ENABLED=false
LIVE_OUTREACH_ENABLED=false
VOICE_ENABLED=false
```

### 4. Prepare the database

A database is where the app saves information.

Create a Neon database and place its private address in `apps/server/.env`.
Then run:

```bash
bun run db:migrate
bun run db:seed
```

The seed command adds Bangladesh places, disabled public sources, and one fake
help group. It does not add a real emergency contact.

### 5. Start the app

```bash
bun run dev
```

Open:

- Web app: <http://localhost:3001>
- Server: <http://localhost:3000>

## Automatic monitoring

A scheduler is a timer for computer tasks. It can call this protected address
about every 15 minutes:

```text
GET /internal/cron/monitor
Authorization: Bearer YOUR_CRON_SECRET
```

Public sources are read only when `MONITORING_ENABLED=true`. Reports sent by
people can still move through the work queue while monitoring is off.

## Useful commands

```bash
bun run dev          # Start the app
bun run check:ci     # Check code style
bun run check-types  # Check TypeScript code
bun run test         # Run tests
bun run build        # Build the project
bun run db:migrate   # Prepare database tables
bun run db:seed      # Add safe starter data
bun run db:studio    # Open the database viewer
```

## Project folders

```text
apps/web/       pages and forms
apps/server/    the web server
packages/api/   agents, rules, and app doorways
packages/auth/  sign-in and access rules
packages/db/    saved data and database tools
packages/env/   settings checks
packages/ui/    shared screen parts
```

An API is a safe doorway that lets two parts of an app talk to each other.

## Help improve the project

You may fork, study, and improve this project. Start with
[CONTRIBUTING.md](CONTRIBUTING.md). Read [SECURITY.md](SECURITY.md) before
reporting a safety or privacy problem.

This project uses the [Apache License 2.0](LICENSE).
