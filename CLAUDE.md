# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Rapid Humanitarian Response Platform — a disaster-intelligence and NGO-coordination layer for Bangladesh. It correlates community reports and approved public feeds into incidents, runs independent verifier agents, and auto-emails opted-in NGO partners only after a strict deterministic consensus gate. It is **not** a dispatch service and must never call or claim to dispatch 999.

## Commands

Bun workspaces + Turborepo. Run from the repo root.

```bash
bun install
bun run dev              # all apps (server :3000, web :3001)
bun run dev:server       # server only (bun --hot)
bun run dev:web          # web only (vite)

bun run check            # biome check --write . (autofix)
bun run check:ci         # biome check on the CI-covered paths only (no writes)
bun run check-types
bun run test
bun run build

bun run db:migrate       # drizzle-kit migrate
bun run db:generate      # generate SQL from schema changes
bun run db:push          # push schema without a migration (dev only)
bun run db:seed
bun run db:studio
```

CI (`.github/workflows/ci.yml`) runs exactly: `check:ci` → `check-types` → `test` → `build`. Run all four before considering a change done.

### Running a single test

Test runners differ per workspace:

- `packages/api`, `packages/auth`, `apps/web` use **vitest**: `bun run --filter @my-better-t-app/api test -- src/domain/verification/consensus.test.ts` (or `cd packages/api && bunx vitest run <path> -t "<name>"`).
- `apps/server` uses **bun test**: `cd apps/server && bun test --conditions=development src/index.test.ts`.

The `--conditions=development` flag matters: workspace packages export `./src/*.ts` under the `development` condition and built `./dist/*.js` otherwise, so without it you test stale build output.

## Architecture

### Workspace layout

- `apps/server` — Hono app, the only runtime entry point. Mounts oRPC handlers, the cron endpoint, and the Resend webhook.
- `apps/web` — Vite + React 19 + TanStack Router (file-based, `routeTree.gen.ts` is generated — never edit) + TanStack Query via `@orpc/tanstack-query`.
- `packages/api` — all business logic: oRPC routers, agents, domain rules, services. Most work happens here.
- `packages/db` — Drizzle schema, migrations, seeds, and **all** query functions. App/API code calls `@my-better-t-app/db/queries/*`; it does not write SQL or use Drizzle directly.
- `packages/auth` — Better Auth instance plus the observer email allowlist check.
- `packages/env` — `@t3-oss/env-core` + Zod validation, split `./server` and `./web`. Add every new env var here; startup fails fast on invalid config.
- `packages/ui` — shadcn/base-ui components, shared Tailwind v4 globals.
- `packages/config` — shared tsconfig bases.

Type safety is end-to-end: `appRouter` in `packages/api/src/routers/index.ts` is exported as `AppRouterClient` and consumed by the web client in `apps/web/src/utils/orpc.ts`. Adding a procedure automatically types the frontend.

### API surface

Two router trees under `packages/api/src/routers/`:

- `public/` — anonymous community report submission and system status. Turnstile-protected, body-limited.
- `observer/` — read-only console. Every procedure goes through `requireObserver` (`middleware/observer.ts`), which requires a session, an email on `OBSERVER_EMAIL_ALLOWLIST`, and a matching live DB user. **The observer console must stay read-only** — it cannot edit facts, add evidence, change state, generate matches, or send notifications.

Procedures are built from `o` (`packages/api/src/procedure.ts`), an oRPC `os.$context<Context>()`.

### Agent pipeline

Everything asynchronous runs through a PostgreSQL work queue, not in-request.

`GET /internal/cron/monitor` (Bearer `CRON_SECRET`, ~every 15 min) → `runMonitoringCycle()` when `MONITORING_ENABLED`, otherwise just `processWorkflowBatch()`. `processWorkflowBatch` claims leased jobs, dispatches by `jobType` through the `supportedJobs` map in `agents/orchestrator.ts`, and records an agent run per job.

Job flow: `monitoring` → `correlation` → `classification` → three independent verifiers (`verification_official`, `verification_humanitarian_news`, `verification_contradiction`) → `verification_consensus` → `priority` + `ngo_matching` → `partner_notification`.

Handlers live in `agents/pipeline.ts` (monitoring through priority), `agents/ngo-matching.ts`, and `agents/partner-notification.ts`. Pure decision logic is isolated in `domain/` (`verification/consensus.ts`, `scoring/confidence.ts`, `scoring/urgency.ts`, `matching/match-organizations.ts`) and is where the unit tests concentrate.

### Safety invariants — do not weaken

These are the point of the system; changes touching them need explicit justification:

- **Consensus gate** (`domain/verification/consensus.ts`): all verifier roles reported, ≥2 supporting outputs, ≥2 independent publisher domains *and* source families, confidence ≥80, core facts present (location, type, occurrence time), no credible contradiction. A contradiction vetoes escalation.
- **Stale-revision protection**: every job carries the incident revision; results from an older revision must not act on newer facts.
- **Six-hour expiry**: revisions without quorum expire without alerting.
- **Partner consent**: only reviewed organizations with a contact email and explicit automation consent may be notified.
- **Idempotency**: workflow jobs, provider requests, and notification records all use idempotency keys; the Resend webhook claims events by `svix-id` before recording.
- **Kill switches default off**: `MONITORING_ENABLED`, `AUTONOMOUS_ESCALATION_ENABLED`, `PARTNER_EMAIL_ENABLED`. Keep them `false` locally.
- Never put secrets, raw report text, or recipient addresses in agent summaries or logs (see `services/logging.ts`, `errors.ts` — errors are mapped to safe public codes).

When adding an agent: strict Zod input, deterministic safety checks, bounded output summary, defined stale-revision behavior, and tests for success, contradiction, retry, duplicate delivery, and forbidden action.

## Conventions

- Formatting/linting is Biome (`biome.json`): double quotes, space indent, organized imports, sorted Tailwind classes for `clsx`/`cva`/`cn`. Lefthook runs it on staged files pre-commit.
- Cross-package imports use the `@my-better-t-app/*` package names with explicit `.js` extensions on relative imports (ESM + `moduleResolution` bundler-style build).
- Dependency versions are pinned centrally in the root `package.json` `workspaces.catalog`; reference them as `"catalog:"` in workspace manifests rather than hardcoding a version.
- `apps/server` runs `scripts/check-workspace-exports.ts` post-build to verify every source file in the runtime packages is reachable through its package `exports` map. If you add a new top-level module to `packages/{api,auth,db,env}` and the build fails there, the exports map or file placement is wrong.
- Tests use fake people and `.example` domains — never real incident or partner data.
