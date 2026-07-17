# Implementation Roadmap

> Planning artifact only. This document describes the approved Version 1 MVP implementation sequence. It does not implement application features.

**Goal:** Build the smallest safe Rapid Humanitarian Response Platform that accepts an anonymous report, preserves the raw report, structures it with schema-validated AI extraction, requires allowlisted operator review, measures evidence confidence and urgency separately, matches reviewed organizations, and prepares manual outreach without sending it.

**Architecture:** Preserve the generated Better-T-Stack monorepo and its package boundaries. The React/TanStack Router web application communicates through same-origin oRPC calls to a Hono/Bun service; Hono owns auth, database, Turnstile, OpenRouter, logging, and request controls; shared business rules live as deterministic modules in `packages/api`; Drizzle schemas and queries remain in `packages/db`.

**Tech stack:** Bun 1.3.x, Turborepo, TypeScript 6 in strict mode, React 19, TanStack Router and Query, Vite 8, Tailwind CSS 4, shadcn/ui, Hono 4, oRPC 1.14, Better Auth 1.6, Drizzle ORM 0.45, Neon PostgreSQL, Zod 4, evlog, Vitest, Cloudflare Turnstile, OpenRouter, and Vercel Services.

---

## Project overview

The platform is an analyst-assisted humanitarian incident triage prototype for Bangladesh, focused on the Chattogram Division and prioritizing Cox's Bazar. Its core promise is that, once public evidence exists, a trained operator can move from a submitted report to a reviewed responder shortlist and editable outreach package in under five minutes.

Version 1 proves only this sequence:

> Submit → store raw report → structure → review → add evidence → score → approve → match → prepare contact → manually confirm a contact attempt.

It does not prove that an incident is true, that a matched organization is available, that outreach was delivered, or that aid or rescue occurred.

### Users and access

- **Anonymous reporter:** Can read safety notices, submit one report, receive a random reference, and view a generic success page. Cannot retrieve the report or browse cases.
- **Allowlisted operator:** Can authenticate, review and edit incidents, add evidence, recalculate scores, approve facts, create matches and outreach drafts, and perform allowed state changes.
- **Open-source contributor:** Receives setup, architecture, safety, contribution, test, and deployment documentation. No contributor-specific application role is implemented.

### MVP operating boundaries

- Demo Mode is enabled by default and visibly labeled on public and operator pages.
- Interface language is English.
- Country is fixed to Bangladesh and division to Chattogram.
- No names, identity documents, personal phone numbers, private medical records, exact household locations, media, faces, or reporter email are requested.
- AI extracts editable structured facts only. It never decides truth, confidence, urgency, organization trust, availability, or permission to contact.
- All scoring, matching, gates, and case transitions are deterministic and server-enforced.
- External contact remains manual. There is no send endpoint or email provider.
- Public pages never expose report details, evidence notes, organization contact data, audit events, or operator identity.

### Must Have scope trace

| ID | Must Have result | Planned coverage |
|---|---|---|
| M01 | Prototype landing page | Steps 12 and 24 |
| M02 | Anonymous report form with Turnstile | Steps 11 and 12 |
| M03 | Better Auth operator access | Steps 8–10 |
| M04 | Raw incident persistence before extraction | Steps 4, 5, 11, and 21 |
| M05 | Strict OpenRouter extraction | Steps 20 and 21 |
| M06 | Human incident review and explicit approval | Steps 13, 14, and 17 |
| M07 | Supporting, contradicting, and context evidence | Step 15 |
| M08 | Separate deterministic confidence and urgency | Steps 16 and 17 |
| M09 | Curated reviewed/demo organization registry | Steps 6 and 19 |
| M10 | Deterministic top-three matching | Steps 18 and 19 |
| M11 | Editable manual outreach package | Step 22 |
| M12 | Protected dashboard and enforced states | Steps 9, 13, and 23 |
| M13 | Minimal safe audit trail | Steps 7 and 25 |
| M14 | Safety, privacy, and accessibility | Steps 2, 3, 12, 24, and 25 |
| M15 | Roadmap and open-source handoff | Steps 24 and 26 |
| M16 | Vercel deployment and required checks | Steps 1 and 27 |

### Explicitly excluded from this MVP

The implementation must not add ReliefWeb import, scheduled monitoring, social-media collection, media uploads, maps or geocoding, Bangla localization, reporter accounts or correction tokens, NGO accounts, organization editing, automatic organization discovery or approval, availability tracking, automatic email delivery, delivery tracking, analytics, payments, donations, public incident browsing, public exact coordinates, chatbots, multi-organization coordination, medical diagnosis, or rescue/deployment decisions.

## Current codebase analysis

### Repository status and structure

The repository is a newly generated Better-T-Stack Bun/Turborepo monorepo. The scaffold is installed, but product functionality has not yet been implemented.

```text
apps/
  server/     Hono transport and oRPC/Better Auth mounting
  web/        React, Vite, TanStack Router, TanStack Query
packages/
  api/        oRPC context, middleware, router, future domain logic
  auth/       Better Auth configuration
  db/         Neon/Drizzle connection and schemas
  env/        Server and browser environment validation
  ui/         Shared shadcn/ui primitives and Tailwind tokens
  config/     Shared TypeScript configuration
public/
  PRD.md      Approved Version 1 build contract
```

At analysis time, Git reports `public/` as untracked. The PRD and this plan should be intentionally added when implementation work is committed.

### Root tooling

- `package.json` declares Bun `1.3.10`, workspaces under `apps/*` and `packages/*`, and a shared dependency catalog.
- Root scripts delegate development, build, and type checking through Turbo.
- Database commands already delegate to `@my-better-t-app/db`.
- `turbo.json` defines `build`, `lint`, `check-types`, `dev`, and database tasks.
- `biome.json` provides formatting and linting; the root `check` command currently applies writes.
- Lefthook runs Biome on staged JavaScript, TypeScript, and JSON-family files.
- There is no `test` task, no Vitest dependency, and no automated test directory.
- The actual type-check command is `bun run check-types`; the PRD says to document generated command names rather than rename them merely for wording consistency.

### Database

- `packages/db/src/index.ts` creates a Neon HTTP Drizzle client with the server-only `DATABASE_URL`.
- `packages/db/drizzle.config.ts` reads `apps/server/.env` and writes migrations to `packages/db/src/migrations`.
- Only Better Auth tables exist: `user`, `session`, `account`, and `verification`.
- There are no incident, evidence, organization, match, outreach, or audit schemas.
- No migrations or seed scripts currently exist.
- Better Auth owns its existing schema and it must not be manually rewritten for product-domain needs.

### API and backend

- `apps/server/src/index.ts` mounts:
  - evlog request middleware;
  - Better Auth under `/api/auth/*`;
  - oRPC under `/rpc`;
  - OpenAPI reference handling under `/api-reference`;
  - CORS using `CORS_ORIGIN`;
  - a root `GET /` health response.
- The oRPC context resolves the Better Auth session for every request.
- `packages/api/src/index.ts` defines public and session-only protected procedures.
- `packages/api/src/routers/index.ts` exposes only `healthCheck` and sample `privateData`.
- Protected middleware does not enforce the operator email allowlist or explicitly confirm an active database user.
- OpenAPI reference handling is currently reachable without a development/authorization gate.
- Error interceptors currently use `console.error`; product-safe structured error handling has not been added.
- Hono body-size limits, Turnstile verification, OpenRouter integration, business rules, repositories, and audit recording are absent.

### Authentication

- Better Auth uses the generated Drizzle adapter and email/password authentication.
- The server already has `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, and `DATABASE_URL` validation.
- Current auth configuration has no 12-character minimum, allowlist hook, account-creation restriction, or second allowlist check in oRPC middleware.
- The current web login route defaults to the sign-up form and exposes a general sign-up toggle, which conflicts with the allowlisted-operator-only requirement.
- Current cookie attributes are secure, HTTP-only, and `SameSite=None` for every environment; implementation must retain production security while verifying that local HTTP development remains functional.

### Frontend and routing

Current TanStack Router files provide:

- `/` through `apps/web/src/routes/index.tsx`, currently a scaffold API-status page;
- `/login` through `apps/web/src/routes/login.tsx`, currently toggling sign-in and sign-up;
- a pathless protected `_auth` layout through `apps/web/src/routes/_auth/route.tsx`;
- `/dashboard` through `apps/web/src/routes/_auth/dashboard.tsx`, currently showing sample private data.

The route guard checks for a client-visible session only. Server procedures are therefore the required authorization boundary. The existing `_auth` folder can fulfill the PRD's logical protected `/_app` layout while preserving the generated pathless-route convention.

Missing routes are `/report`, `/report/success/$reference`, `/roadmap`, `/privacy`, `/sign-in`, protected incident detail, and protected organizations. There is no public incident route, which is correct.

The shared UI package currently has useful primitives including buttons, cards, checkboxes, inputs, textareas, dropdowns, tooltips, skeletons, empty state, and Sonner notifications. Product-specific components, accessible error summaries, data tables/cards, select controls, score displays, and the incident workflow UI do not exist.

### Environment and deployment

- `apps/server/.env` currently defines only the four generated auth/database/origin keys.
- `apps/web/.env` currently defines only `VITE_SERVER_URL`.
- Missing validated keys are the operator allowlist, OpenRouter configuration, Turnstile keys, app/GitHub metadata, and server/web Demo Mode flags.
- `vercel.json` already defines one Vercel project with `web` and `server` services, same-domain `/api/*` routing, and SPA fallback.
- `scripts/sync-vercel-env.ts` safely syncs package-local env files while overriding `VITE_SERVER_URL` to `/api` and omitting generated origin keys.
- The generated Vercel/Neon connection pattern should be preserved unless a verified deployment problem requires a documented change.

### Installed skills and MCP configuration

`skills-lock.json` pins seven project skills with source hashes:

- `analyze-logs`
- `better-auth-best-practices`
- `hono`
- `neon-postgres`
- `review-logging-patterns`
- `turborepo`
- `web-design-guidelines`

`.mcp.json` and `.codex/config.toml` consistently configure:

- Better-T-Stack MCP for scaffold/configuration guidance;
- Context7 for current library documentation;
- shadcn MCP for UI primitive guidance;
- Neon HTTP MCP for database project and connection workflows;
- Better Auth HTTP MCP for current authentication guidance.

This roadmap uses the installed Turborepo, Hono, Better Auth, and Neon guidance plus the Better-T-Stack MCP's read-only stack guidance. During implementation, use Neon and Better Auth MCP access only for configuration/documentation or user-authorized external setup; never place returned credentials in source or logs.

### Primary gaps to close

1. Domain data model, constraints, migrations, queries, and demo seed data.
2. Public intake validation, Turnstile, raw-first persistence, safe success response, and failure behavior.
3. Server-enforced operator allowlist and restricted account creation.
4. Incident review, evidence, scores, approval gates, matches, outreach, and state transitions.
5. Strict OpenRouter extraction with timeout, validation, safe metadata, and retry.
6. Product routes, accessible responsive UI, prototype warnings, and complete loading/error/empty/success states.
7. Safe audit events and structured logging without sensitive payloads.
8. Automated domain/procedure tests, open-source files, release checks, smoke tests, and deployment verification.

## Architecture understanding

### Runtime flow

```text
Browser
  ├─ TanStack Router routes and feature components
  ├─ TanStack Query + typed oRPC client
  ├─ Better Auth React client
  ├─ Turnstile widget
  └─ Clipboard / local mail client only
          │ same-origin /api
          ▼
Hono on Bun
  ├─ body limit, CORS/origin, request logging, safe errors
  ├─ Better Auth /api/auth/*
  └─ oRPC /rpc
          ├─ public procedures
          └─ session + allowlist protected procedures
                 ├─ Drizzle → Neon PostgreSQL
                 ├─ Turnstile verification
                 └─ OpenRouter extraction
```

### Module boundaries

| Boundary | Responsibility |
|---|---|
| `apps/web/src/routes` | Thin route definitions, loaders, search params, and composition |
| `apps/web/src/features` | Report, incident, evidence, organization, and outreach UI blocks |
| `apps/web/src/components` | Cross-feature shell, prototype banner, page headers, statuses, loading, and errors |
| `apps/server/src/index.ts` | Hono transport, auth mounting, middleware, routing, and production exposure rules |
| `packages/api/src/routers` | oRPC contracts, authorization calls, orchestration, and safe outputs |
| `packages/api/src/domain` | Pure extraction schemas, scoring, matching, state-transition, and outreach rules |
| `packages/api/src/services` | Turnstile, OpenRouter, audit, and workflow services |
| `packages/db/src/schema` | Drizzle table definitions, relations, constraints, and indexes |
| `packages/db/src/queries` | Focused database reads/writes with no web imports |
| `packages/auth/src` | Better Auth configuration, allowlist parsing, and account-creation policy |
| `packages/env/src` | Server/client environment validation and no secret leakage to `VITE_*` |
| `packages/ui/src` | Generic accessible UI primitives only |

The PRD's repository tree is illustrative and places some domain code under `apps/server`. The actual scaffold already separates `packages/api`, `packages/auth`, and `packages/db`; the PRD explicitly says to preserve the generated structure, so this roadmap adapts the feature locations to those packages instead of moving or duplicating them.

### Data model

- **incidents:** Restricted raw report, public reference, editable extracted/reviewed facts, scores, state, approval actor/time, and extraction metadata/status.
- **evidence:** Public URL, server-derived domain, category, relationship, independence decision, optional note/time, and operator actor.
- **organizations:** Curated or visibly demo organization records with areas, sectors, review status/sources, and optional public contact.
- **incident_matches:** Materialized top matches with deterministic score and plain-language reasons.
- **outreach_drafts:** Editable subject/body and manual action status per incident/organization.
- **audit_events:** Event type, optional incident and actor IDs, safe metadata, and timestamp.
- **Better Auth tables:** Remain owned by the generated auth schema.

Every foreign key, uniqueness rule, score bound, affected-estimate bound, and required query index in PRD section 10 must be expressed in Drizzle and verified in generated SQL.

### Authorization and privacy invariants

1. Public oRPC surface is limited to report creation and system status.
2. Every operator procedure checks both a valid session and a normalized allowlisted email on the server.
3. Account creation is rejected server-side before a non-allowlisted user is created.
4. Public submission output contains only `{ reference, status }`.
5. Raw reports never appear in public outputs, organization matching, outreach bodies, audit metadata, or logs.
6. Evidence, organization contact information, audit events, and operator identity remain protected.
7. AI output is rejected unless it matches the strict schema; unknown facts remain null or explicitly unknown.
8. No UI visibility rule substitutes for an oRPC authorization or state/gate check.

### Required user flows

**Anonymous report**

1. Read the prototype and data-minimization notices.
2. Complete one page with three visible fieldsets.
3. Accept the data notice and obtain a Turnstile token.
4. Submit to `public.report.create`.
5. Server verifies body size, honeypot, schema, URL rules, and Turnstile.
6. Server commits the raw incident and `report.created` audit event before extraction.
7. Extraction succeeds or fails without changing report acceptance.
8. Browser receives only a random reference and status and navigates to a generic confirmation.

**Operator triage**

1. Sign in or create an account only if allowlisted.
2. Open a protected incident.
3. Review/edit extracted facts and start review.
4. Add supporting, contradicting, or context evidence.
5. Explicitly recalculate confidence and urgency.
6. Approve facts only after the server rechecks evidence and confidence gates.
7. Generate top-three reviewed organization matches.
8. Generate and edit deterministic outreach.
9. Copy the package or open a local `mailto:` draft.
10. Separately confirm the contact attempt.
11. Review safe audit events and make only allowed case transitions.

### Development constraints

- Follow the PRD's 6–8 hour build contract and Must Have cut line.
- Build a usable vertical slice before the full dashboard and static open-source pages.
- Use oRPC rather than creating a parallel REST API.
- Keep routes and Hono transport thin; keep business rules testable and deterministic.
- Store raw input before any generated data.
- Do not automatically retry OpenRouter; provide an operator retry action.
- Do not automatically recalculate scores when evidence changes.
- Do not invent real organization data or email addresses. Demo email addresses must use `.example`.
- Keep package scripts within packages and root scripts as `turbo run` delegates.
- Add no state-management library; use TanStack Query, route state, and local form state.
- Preserve generated auth, env, Neon/Drizzle, and Vercel structure unless a failing requirement proves a change is necessary.
- Verify each milestone with focused tests before continuing.

## Phase 1: Foundation

### Step 1: Establish package-owned quality gates

**Objective**

Create the minimum test and verification pipeline needed to develop the MVP safely without changing application behavior.

**Files/modules affected**

- `package.json`
- `turbo.json`
- `packages/api/package.json`
- `packages/api/vitest.config.ts` (create only if configuration is needed)
- `apps/web/package.json` and `apps/server/package.json` only if they receive package-specific checks

**Technical tasks**

- Add Vitest to the package that owns domain and procedure tests, initially `packages/api`.
- Add package-level `test` scripts and a root `test` script that delegates through `turbo run test`.
- Register the `test` task in `turbo.json` with correct dependency/cache behavior and no artificial serialization.
- Keep existing `check-types` naming and document it later instead of renaming generated scripts solely to match PRD prose.
- Define a non-mutating CI lint/check command if the existing write-mode `bun run check` is unsuitable for release verification.
- Record exact baseline commands: install, check, type check, test, build, database generation, and deploy dry run.

**Dependencies**

- None.

**Completion criteria**

- `bun run test` resolves through Turbo and can run an empty/minimal suite.
- Existing `bun run check-types` and `bun run build` remain valid.
- Test logic lives in packages rather than being embedded in the root script.
- No product feature has been implemented.

### Step 2: Validate MVP configuration and central constants

**Objective**

Make all server and web configuration explicit, validated at startup, and safe across local, preview, and production environments.

**Files/modules affected**

- `packages/env/src/server.ts`
- `packages/env/src/web.ts`
- `apps/server/.env.example` (create)
- `apps/web/.env.example` (create)
- `packages/api/src/domain/incidents/constants.ts` (create)
- `packages/api/src/domain/incidents/types.ts` (create)

**Technical tasks**

- Add server validation for `OPERATOR_EMAIL_ALLOWLIST`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_APP_NAME`, `OPENROUTER_APP_URL`, `TURNSTILE_SECRET_KEY`, and `DEMO_MODE`.
- Add web validation for `VITE_TURNSTILE_SITE_KEY`, `VITE_APP_NAME`, `VITE_GITHUB_URL`, and `VITE_DEMO_MODE`.
- Keep `DATABASE_URL`, auth secrets, OpenRouter keys, and Turnstile secret server-only.
- Normalize the operator allowlist as trimmed lowercase email addresses and reject an empty production allowlist.
- Require Demo Mode to default to true and fail production startup when required secrets/model configuration are absent.
- Define single-source constants for incident types, needs, risk flags, pilot country/division, district options, evidence categories/relationships, organization sectors/statuses, extraction statuses, case states, and audit event names.

**Dependencies**

- Step 1.

**Completion criteria**

- All PRD environment keys are schema-validated.
- `.env.example` files contain placeholders only and no credentials.
- Browser bundles can import only `VITE_*` values.
- Pilot values are defined once and can be reused by contracts and UI.

### Step 3: Harden the Hono transport and logging boundary

**Objective**

Prepare the backend entrypoint for safe public input, protected procedures, and non-sensitive operational diagnostics.

**Files/modules affected**

- `apps/server/src/index.ts`
- `packages/api/src/context.ts`
- `packages/api/src/errors.ts` (create)
- `packages/api/src/services/logging.ts` (create if needed beyond Hono wiring)

**Technical tasks**

- Add request IDs, maximum body-size handling for report submission, and generic error responses.
- Retain CORS/origin and credential behavior required for local split ports and same-domain production.
- Replace raw `console.error` interceptors with safe structured error classification through evlog.
- Ensure logs contain procedure, status, duration, request ID, incident ID when safe, model ID, and validation outcome, but never raw report text, outreach bodies, tokens, sessions, secrets, or database URLs.
- Restrict `/api-reference` to local development or an authenticated operator surface; do not expose it publicly in production.
- Preserve Better Auth at `/api/auth/*`, oRPC at `/rpc`, and Vercel's existing `/api/*` rewrite contract.

**Dependencies**

- Steps 1–2.

**Completion criteria**

- Oversized requests receive a safe rejection.
- Unexpected errors do not return stack traces or database details to public clients.
- Production OpenAPI documentation is unavailable publicly.
- Logging fields comply with PRD section 12.6.

## Phase 2: Database and Backend

### Step 4: Define the complete Drizzle domain schema

**Objective**

Represent the PRD data model, integrity constraints, relationships, and query indexes without modifying Better Auth-owned tables.

**Files/modules affected**

- `packages/db/src/schema/incidents.ts` (create)
- `packages/db/src/schema/evidence.ts` (create)
- `packages/db/src/schema/organizations.ts` (create)
- `packages/db/src/schema/matches.ts` (create)
- `packages/db/src/schema/outreach.ts` (create)
- `packages/db/src/schema/audit.ts` (create)
- `packages/db/src/schema/index.ts`
- `packages/db/src/schema/auth.ts` (reference only unless a generated auth migration requires regeneration)
- `packages/db/src/migrations/*` (generated)

**Technical tasks**

- Add UUID primary keys and UTC timestamp columns for all six domain tables.
- Add the unique random incident reference and restricted raw-report column.
- Add controlled fields for incident/extraction state, occurrence precision, evidence categories/relationships, organization review status, outreach status, needs, risk flags, and unknowns.
- Add actor foreign keys to Better Auth users where the PRD requires them.
- Add cascade behavior for incident-owned evidence and appropriate foreign keys for matches/outreach/audit.
- Add unique `(incident_id, organization_id)` match constraint.
- Add score checks from 0–100 and non-negative affected-estimate check.
- Enforce that a non-demo organization marked Reviewed has a non-null last-reviewed timestamp.
- Add all state, urgency, updated-time, incident relation, and audit timeline indexes listed in PRD section 10.7.
- Generate and inspect SQL to verify that Drizzle emitted every required constraint and index.

**Dependencies**

- Step 2.

**Completion criteria**

- Drizzle generation succeeds without rewriting the Better Auth schema.
- Generated SQL includes all six domain tables, required foreign keys, checks, unique constraints, and indexes.
- Raw report is non-null while extracted/reviewed fields can start null.
- The schema contains no reporter email, media, exact-coordinate, delivery, availability, payment, or future-import tables.

### Step 5: Add focused database query modules

**Objective**

Create database operations that support raw-first persistence and protected workflows without leaking Drizzle calls into routes or React components.

**Files/modules affected**

- `packages/db/src/queries/incidents.ts` (create)
- `packages/db/src/queries/evidence.ts` (create)
- `packages/db/src/queries/organizations.ts` (create)
- `packages/db/src/queries/matches.ts` (create)
- `packages/db/src/queries/outreach.ts` (create)
- `packages/db/src/queries/audit.ts` (create)
- `packages/db/src/queries/users.ts` (create if an explicit active-user lookup is needed)
- `packages/db/package.json`

**Technical tasks**

- Add an incident creation transaction that inserts the raw report and `report.created` audit record before returning.
- Add protected incident list/get/update/state/approval data operations with explicit selected columns.
- Add evidence add/remove/list operations and server-derived publisher-domain storage.
- Add organization list and reviewed-only candidate queries.
- Add replacement/upsert behavior for generated matches and outreach draft reads/writes.
- Add audit insertion and chronological timeline queries using safe metadata only.
- Ensure public query outputs never select raw report plus public response fields together.

**Dependencies**

- Step 4.

**Completion criteria**

- Each query file has one domain responsibility.
- Raw report creation and its audit event are atomic.
- Public-facing creation can return only reference/status without a second broad incident fetch.
- No web package imports the database package.

### Step 6: Create deterministic demo seed data and migration workflow

**Objective**

Provide safe demonstration records and repeatable database commands without inventing real organization contact data.

**Files/modules affected**

- `packages/db/src/seed/organizations.ts` (create)
- `packages/db/src/seed/index.ts` (create)
- `packages/db/package.json`
- `package.json`
- `turbo.json`
- `packages/db/src/migrations/*`

**Technical tasks**

- Add at least one Reviewed demo organization sufficient for the first vertical slice; add more only if time allows.
- Use a fictional name, visible `is_demo=true`, public-looking `.example` website/email, explicit Bangladesh/Chattogram coverage, controlled sectors, and review-source placeholders that are clearly demo data.
- Add idempotent seed behavior so repeated local setup does not duplicate records.
- Add package-owned `db:seed` and root Turbo delegation.
- Document development use of `db:push` versus generated migrations; production must use migration application rather than schema push.

**Dependencies**

- Steps 4–5.

**Completion criteria**

- A clean database can migrate and seed successfully.
- Only Reviewed demo organizations are eligible for matching.
- Every demo organization is visibly identifiable in stored data.
- No real NGO identity or invented real contact detail is present.

### Step 7: Establish the audit service and public system status

**Objective**

Create reusable safe audit recording and replace scaffold API examples with the first production-shaped router structure.

**Files/modules affected**

- `packages/api/src/services/audit.ts` (create)
- `packages/api/src/routers/public/system.ts` (create)
- `packages/api/src/routers/public/index.ts` (create)
- `packages/api/src/routers/operator/index.ts` (create)
- `packages/api/src/routers/index.ts`
- `packages/api/src/routers/index.test.ts` or focused service tests

**Technical tasks**

- Define typed audit event names and metadata schemas that allow IDs, counts, score values, and old/new states only.
- Centralize actor/incident/event insertion and reject metadata keys capable of carrying sensitive payloads.
- Implement `public.system.status` with non-sensitive service/Demo Mode status only.
- Remove `healthCheck`/`privateData` sample semantics and compose nested `public` and `operator` routers matching the PRD procedure groups.
- Keep unimplemented procedure groups absent until their steps rather than exposing placeholders.

**Dependencies**

- Steps 2, 3, and 5.

**Completion criteria**

- `public.system.status` is callable without a session and exposes no secrets.
- Audit metadata validation rejects raw report and outreach-body fields.
- The exported router shape is ready for `public.report.*` and `operator.*`.

## Phase 3: Authentication and Authorization

### Step 8: Enforce allowlisted Better Auth account creation

**Objective**

Restrict operator accounts to normalized allowlisted emails and meet the MVP password/session requirements.

**Files/modules affected**

- `packages/auth/src/allowlist.ts` (create)
- `packages/auth/src/index.ts`
- `packages/env/src/server.ts`
- `packages/auth/src/index.test.ts` or hook-focused tests

**Technical tasks**

- Reuse one allowlist parser for auth hooks and oRPC middleware.
- Add a server-side Better Auth before hook that rejects user creation when the submitted email is not allowlisted.
- Require email/password authentication with a minimum password length of 12.
- Do not add social providers, password reset, email verification, admin UI, or other future-release auth features.
- Preserve Better Auth CSRF/origin checks and prevent auth tokens from moving to local storage.
- Verify secure HTTP-only production cookies and environment-appropriate local cookie behavior without weakening production.

**Dependencies**

- Steps 2 and 4.

**Completion criteria**

- An allowlisted email can create/sign into an operator account.
- A non-allowlisted email cannot create an account.
- Passwords shorter than 12 characters are rejected server-side.
- Existing Better Auth schema remains generated/adapter-compatible.

### Step 9: Add server-enforced operator procedure middleware

**Objective**

Make session, allowlist, and active-user checks mandatory for every non-public oRPC procedure.

**Files/modules affected**

- `packages/api/src/context.ts`
- `packages/api/src/index.ts`
- `packages/api/src/middleware/operator.ts` (create if clearer than keeping middleware in `index.ts`)
- `packages/api/src/middleware/operator.test.ts`

**Technical tasks**

- Resolve the session once per request and carry only the required actor fields into procedure context.
- Return `UNAUTHORIZED` when no valid session exists.
- Normalize and recheck the session email against the current allowlist for every protected procedure; return `FORBIDDEN` when absent.
- Confirm the session user still has an active/existing user record before continuing.
- Export an `operatorProcedure` base and ensure all `operator.*` routes derive from it.
- Add negative tests for no session and non-allowlisted session.

**Dependencies**

- Steps 5 and 8.

**Completion criteria**

- All operator procedure groups have one auditable authorization boundary.
- Hiding or guarding a frontend route is not required for data safety.
- Required unauthorized/forbidden tests pass.

### Step 10: Replace public registration UI with operator access

**Objective**

Align the frontend auth flow with allowlisted operator access and retain a pathless protected layout.

**Files/modules affected**

- `apps/web/src/routes/sign-in.tsx` (create)
- `apps/web/src/routes/login.tsx` (remove or convert to a redirect)
- `apps/web/src/routes/_auth/route.tsx`
- `apps/web/src/components/sign-in-form.tsx`
- `apps/web/src/components/sign-up-form.tsx`
- `apps/web/src/components/user-menu.tsx`
- `apps/web/src/lib/auth-client.ts`

**Technical tasks**

- Make `/sign-in` the canonical route and default to sign-in, never sign-up.
- Offer first-time account setup only as a secondary, explicitly allowlisted-operator action; do not present general public registration.
- Update client validation to the 12-character password minimum.
- Route successful authentication to `/dashboard`.
- Preserve the `_auth` pathless layout, redirect missing sessions to `/sign-in`, and rely on server procedures for authoritative allowlist enforcement.
- Add clear forbidden/account-not-allowlisted messaging without revealing the allowlist.
- Keep sign-out and user-menu behavior, but do not expose operator identity on public pages.

**Dependencies**

- Steps 8–9.

**Completion criteria**

- `/login` no longer exposes the scaffold's default sign-up screen.
- Anonymous navigation to protected routes redirects to `/sign-in`.
- Non-allowlisted users receive no operator data even if they manipulate client routing.
- Auth errors are accessible and do not disclose sensitive configuration.

## Phase 4: Core Incident Management

### Step 11: Implement public report validation and raw-first creation

**Objective**

Accept a safe anonymous report only after all trust-boundary checks, persist it before extraction, and return a minimal response.

**Files/modules affected**

- `packages/api/src/domain/reports/schema.ts` (create)
- `packages/api/src/services/turnstile.ts` (create)
- `packages/api/src/services/reports.ts` (create)
- `packages/api/src/routers/public/report.ts` (create)
- `packages/api/src/routers/public/index.ts`
- `packages/db/src/queries/incidents.ts`
- `packages/api/src/routers/public/report.test.ts`

**Technical tasks**

- Define the exact one-page report input schema using shared pilot constants.
- Enforce required incident type, district/area, approximate location, time description, at least one need, 40–2,000 trimmed description, accepted data notice, and Turnstile token.
- Allow optional public source URL only for HTTP/HTTPS and optional non-negative integer affected population.
- Reject a non-empty honeypot.
- Verify every submission server-side with Turnstile; production has no bypass flag and local development uses Cloudflare test keys.
- Generate a non-guessable unique public reference.
- Serialize the complete minimal form snapshot into the restricted `raw_report` field so the original incident type, place/time descriptions, needs, description, optional source URL, and optional affected estimate survive independently of extraction.
- Commit the raw report plus `report.created` before calling any extraction service.
- Return only `{ reference, status }`; map Turnstile, validation, and persistence failures to safe retry/correction messages.

**Dependencies**

- Steps 3, 5, 7, and 9.

**Completion criteria**

- Invalid Turnstile, URL schemes, affected estimates, description lengths, missing fields, and honeypot submissions are rejected.
- Database failure produces no success/reference response.
- Successful creation stores the raw report and audit event before any generated fields.
- Procedure tests prove minimal public output and raw-first ordering.

### Step 12: Build the landing, report, and generic success flow

**Objective**

Provide the anonymous reporter's complete mobile-first flow with persistent safety language and accessible failure recovery.

**Files/modules affected**

- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/report.tsx` (create)
- `apps/web/src/routes/report/success/$reference.tsx` (create)
- `apps/web/src/features/reports/incident-form.tsx` (create)
- `apps/web/src/features/reports/report-schema.ts` (create only for client feedback; server schema remains authoritative)
- `apps/web/src/components/prototype-banner.tsx` (create)
- `apps/web/src/components/error-summary.tsx` (create)
- `apps/web/src/components/page-header.tsx` (create)
- `packages/ui/src/components/*` only for missing generic accessible primitives

**Technical tasks**

- Replace the scaffold ASCII landing page with the PRD content order and required prototype notice.
- Build one report page with three visible fieldsets; do not create a route-based wizard.
- Use the shared district/need/incident constants rather than duplicate option arrays.
- Show the exact data-minimization notice and require the data-notice checkbox.
- Integrate the Turnstile widget using only the public site key.
- Show field-level errors plus a linked error summary and move focus to it after failure.
- Prevent duplicate submission, announce status through an ARIA live region, and preserve form values in browser memory after recoverable API failure.
- Navigate to a generic success page that shows only the reference and does not fetch incident data.

**Dependencies**

- Steps 2, 10, and 11.

**Completion criteria**

- The prototype warning and primary report action are visible at 360 px without misleading rescue/aid claims.
- A valid report returns a generic success page in under the target interaction time.
- Keyboard and focus behavior meets the PRD form requirements.
- No reporter email or prohibited personal-data field exists.

### Step 13: Implement incident workflow rules and operator procedures

**Objective**

Create the protected server workflow for listing, loading, editing, starting review, and changing incident state.

**Files/modules affected**

- `packages/api/src/domain/incidents/state-machine.ts` (create)
- `packages/api/src/domain/incidents/state-machine.test.ts` (create)
- `packages/api/src/routers/operator/incidents.ts` (create)
- `packages/api/src/routers/operator/index.ts`
- `packages/db/src/queries/incidents.ts`
- `packages/api/src/services/audit.ts`

**Technical tasks**

- Implement pure allowed transitions for submitted, reviewing, corroborated, outreach_ready, contact_attempted, closed, and rejected.
- Implement `operator.incident.list`, `get`, `update`, `startReview`, and `changeState` with strict input/output schemas.
- Limit editable facts to the PRD's reviewed fields and render/store raw description only as plain text.
- Track reviewer actor/time and emit `incident.edited`, `incident.review_started`, and `incident.state_changed` with safe old/new values.
- Treat `closed` as triage closure, never humanitarian resolution.
- Reject illegal transitions on the server regardless of UI button visibility.

**Dependencies**

- Steps 5, 7, 9, and 11.

**Completion criteria**

- Operator procedures reject missing/forbidden sessions.
- Every allowed transition passes and every unlisted transition fails in pure tests.
- Update responses contain protected incident data only.
- Raw reports remain excluded from lists, matches, outreach, and public surfaces.

### Step 14: Build the protected incident review surface

**Objective**

Let an operator review and edit all approved incident fields while preserving thin routes and complete UI states.

**Files/modules affected**

- `apps/web/src/routes/_auth/incidents/$incidentId.tsx` (create)
- `apps/web/src/features/incidents/incident-detail.tsx` (create)
- `apps/web/src/features/incidents/incident-review-form.tsx` (create)
- `apps/web/src/features/incidents/incident-status.tsx` (create)
- `apps/web/src/components/status-badge.tsx` (create)
- `apps/web/src/components/score-badge.tsx` (create)
- `apps/web/src/components/loading-state.tsx` (create)
- `apps/web/src/components/empty-state.tsx` (create or adapt the shared primitive)

**Technical tasks**

- Load incident data through protected oRPC query options.
- Present title/location, state, urgency, confidence, and current required action before the editable facts.
- Support title, summary, type, district, approximate location, occurrence time/precision, affected estimate, needs, risk flags, and unknowns.
- Make extraction pending/failed/complete status visible without implying verification.
- Add explicit start-review and save actions with confirmations for state changes.
- Provide loading, not-found, forbidden, error, dirty, saving, and saved states.
- Keep the route component limited to data dependencies and composition; place form behavior in the feature module.

**Dependencies**

- Steps 10, 13, and the shared components from Step 12.

**Completion criteria**

- An allowlisted operator can open and edit a submitted incident.
- An anonymous or forbidden user cannot retrieve incident data.
- Form labels, validation, focus, and status announcements are keyboard accessible.
- No public incident detail route is introduced.

## Phase 5: Evidence and Verification

### Step 15: Implement evidence records, procedures, and UI

**Objective**

Allow operators to manage public evidence with explicit source quality, relationship, and independence decisions.

**Files/modules affected**

- `packages/api/src/domain/evidence/schema.ts` (create)
- `packages/api/src/routers/operator/evidence.ts` (create)
- `packages/db/src/queries/evidence.ts`
- `packages/api/src/routers/operator/evidence.test.ts`
- `apps/web/src/features/evidence/evidence-form.tsx` (create)
- `apps/web/src/features/evidence/evidence-list.tsx` (create)
- `apps/web/src/routes/_auth/incidents/$incidentId.tsx`

**Technical tasks**

- Validate HTTP/HTTPS URL, source name, category, relationship, optional publication time, optional note up to 500 characters, and operator independence checkbox.
- Derive and store publisher domain on the server; do not accept it from the browser.
- Implement `operator.evidence.create` and `remove`, scoped to the incident and actor.
- Emit `evidence.added` and `evidence.removed` with IDs/categories/relationships only.
- Do not recalculate scores automatically when evidence changes.
- Display Supports, Contradicts, and Context Only distinctly with text, not color alone.
- Explain that distinct domains do not prove independence and require the operator's explicit confirmation.

**Dependencies**

- Steps 5, 7, 9, and 14.

**Completion criteria**

- Operator can add supporting and contradicting evidence and remove an incorrect record.
- Publisher domain is server-derived.
- Evidence changes leave stored scores unchanged until explicit recalculation.
- Evidence URLs are visible only on protected pages.

### Step 16: Implement deterministic confidence and urgency scoring

**Objective**

Encode the exact PRD formulas as pure, explainable, thoroughly tested functions.

**Files/modules affected**

- `packages/api/src/domain/scoring/confidence.ts` (create)
- `packages/api/src/domain/scoring/urgency.ts` (create)
- `packages/api/src/domain/scoring/types.ts` (create)
- `packages/api/src/domain/scoring/confidence.test.ts` (create)
- `packages/api/src/domain/scoring/urgency.test.ts` (create)
- `packages/api/src/routers/operator/score.ts` (create)
- `packages/db/src/queries/incidents.ts`

**Technical tasks**

- Implement confidence base values by evidence category.
- Apply +20 for a second independent supporting source, +10 for a third, -30 for an unresolved credible contradiction, -10 for missing location, and -10 for missing time; clamp 0–100.
- Apply exact confidence labels: Unverified, Needs Review, and Corroborated.
- Implement urgency points for trapped/danger, urgent medical need, no safe water, displacement/no shelter, no food, vulnerable groups, and blocked access; clamp 0–100.
- Apply exact urgency labels: Low, Medium, High, and Critical.
- Return score breakdown entries naming which evidence/flags affected the result.
- Implement explicit `operator.score.recalculate` to persist both scores and emit `scores.calculated`.

**Dependencies**

- Steps 13 and 15.

**Completion criteria**

- Boundary, independence, contradiction, missing-data, clamp, and label tests pass.
- Confidence and urgency remain separate values and explanations.
- No model call influences either score.
- The UI can display numeric value, label, and accessible explanation without relying on color.

### Step 17: Enforce fact approval and outreach gates

**Objective**

Prevent facts from being approved or outreach from being prepared until all evidence requirements pass on the server.

**Files/modules affected**

- `packages/api/src/domain/incidents/approval.ts` (create)
- `packages/api/src/domain/incidents/approval.test.ts` (create)
- `packages/api/src/routers/operator/incidents.ts`
- `packages/db/src/queries/incidents.ts`
- `apps/web/src/features/incidents/incident-review-form.tsx`
- `apps/web/src/features/incidents/approval-gate.tsx` (create)

**Technical tasks**

- Require at least one supporting evidence record.
- Require confidence at least 70 and at least one supporting source with base value 40 or higher.
- Reject approval when an unresolved credible contradiction exists.
- Require the operator's explicit `I reviewed these facts against the listed evidence` confirmation.
- Re-read current incident/evidence and recalculate/revalidate the gate server-side; do not trust displayed client scores.
- On success, record reviewer/time, set facts approved, move reviewing to corroborated, and emit `incident.facts_approved` plus state audit data.
- Show every passed/failed condition in the incident UI.

**Dependencies**

- Steps 13, 15, and 16.

**Completion criteria**

- Approval below the gate fails in procedure tests.
- A qualifying incident can be approved exactly once or safely revalidated.
- Approved facts identify the operator and time.
- No organization matching or outreach generation can bypass the same server gate.

## Phase 6: NGO Matching

### Step 18: Implement pure reviewed-organization matching

**Objective**

Produce a deterministic, explainable top-three shortlist from reviewed registry records only.

**Files/modules affected**

- `packages/api/src/domain/matching/sector-map.ts` (create)
- `packages/api/src/domain/matching/match-organizations.ts` (create)
- `packages/api/src/domain/matching/match-organizations.test.ts` (create)
- `packages/api/src/routers/operator/match.ts` (create)
- `packages/db/src/queries/organizations.ts`
- `packages/db/src/queries/matches.ts`

**Technical tasks**

- Map each incident need to the exact PRD sectors.
- Apply +40 for the first sector match, up to +20 for additional sector matches, +25 exact district, +15 Chattogram Division, +10 Bangladesh, and +5 public contact email; clamp 0–100.
- Exclude Needs Review and Do Not Contact organizations before scoring.
- Require approved facts and the outreach confidence gate before generating matches.
- Sort deterministically by score and a stable tie-breaker, keep only three, and persist score/reasons.
- Return plain-language reasons, `Unknown in Version 1` availability, and Demo label.
- Emit `matches.generated` with incident ID, count, and score summary only.

**Dependencies**

- Steps 6, 7, and 17.

**Completion criteria**

- Tests prove non-reviewed exclusion, exact scoring, tie stability, order, and top-three limit.
- No availability claim is inferred.
- No AI call participates in matching.
- Empty candidate results return a safe empty state rather than weakening rules.

### Step 19: Add the read-only organization registry and match cards

**Objective**

Expose reviewed registry information and incident matches to operators without adding a Version 1 editor.

**Files/modules affected**

- `packages/api/src/routers/operator/organizations.ts` (create)
- `apps/web/src/routes/_auth/organizations.tsx` (create)
- `apps/web/src/features/organizations/organization-list.tsx` (create)
- `apps/web/src/features/organizations/organization-match-card.tsx` (create)
- `apps/web/src/routes/_auth/incidents/$incidentId.tsx`

**Technical tasks**

- Implement `operator.organization.list` as a protected, read-only procedure.
- Add a protected registry route showing name, website, coverage, sectors, review status/source, last-reviewed date, and visible Demo status.
- Add match generation and top-three cards to incident detail.
- Show score, reasons, contact-present/absent, `Unknown in Version 1` availability, and Demo label in text.
- Add an empty state that explains that no reviewed match met the rules.
- Do not add create/edit/delete organization controls.

**Dependencies**

- Steps 10 and 18.

**Completion criteria**

- Only operators can view organization contact data.
- Demo records are unmistakably labeled.
- Match cards show deterministic reasons and never claim response capacity.
- Registry editing remains outside the MVP.

## Phase 7: AI Integration

### Step 20: Implement the strict extraction contract and OpenRouter client

**Objective**

Convert untrusted report text into validated editable fields while preventing model output from controlling decisions.

**Files/modules affected**

- `packages/api/src/domain/extraction/schema.ts` (create)
- `packages/api/src/domain/extraction/prompt.ts` (create)
- `packages/api/src/domain/extraction/schema.test.ts` (create)
- `packages/api/src/services/openrouter.ts` (create)
- `packages/api/src/services/extraction.ts` (create)

**Technical tasks**

- Implement the PRD extraction Zod schema exactly and reject extra keys.
- Build a fixed system instruction that treats source text as untrusted data, requests JSON only, preserves unknowns/nulls, and forbids credibility, urgency, organization, and contact decisions.
- Send only the minimum necessary report fields to OpenRouter.
- Use the single pinned `OPENROUTER_MODEL`.
- Enforce a 20-second server timeout and no automatic repeated retry.
- Parse JSON and validate it before any generated field write.
- Record model ID, request time, duration, and validation result in safe logs/audit metadata without the full prompt, report, or key.

**Dependencies**

- Steps 2, 3, and 7.

**Completion criteria**

- Valid fixture output passes and invalid/extra/invented-type output fails.
- An unvalidated model response can never be written to incident fields.
- Affected population remains null unless explicit source text supports it.
- The model has no database, auth, contact-list, scoring, or tool access.

### Step 21: Orchestrate extraction after raw persistence and add operator retry

**Objective**

Attach AI extraction to the report lifecycle without allowing provider failure to lose or reject an already stored report.

**Files/modules affected**

- `packages/api/src/services/reports.ts`
- `packages/api/src/services/extraction.ts`
- `packages/api/src/routers/public/report.ts`
- `packages/api/src/routers/operator/incidents.ts`
- `packages/db/src/queries/incidents.ts`
- `packages/api/src/routers/public/report.test.ts`
- `apps/web/src/features/incidents/incident-detail.tsx`

**Technical tasks**

- After the raw incident transaction commits, emit `extraction.started` and call the extraction service.
- On validated success, update only generated incident fields, set model/status metadata, and emit `extraction.completed`.
- On timeout, provider error, invalid JSON, or schema failure, keep the incident, set extraction failed, and emit `extraction.failed`.
- Ensure extraction success/failure does not change the minimal public success response.
- Implement protected `operator.incident.retryExtraction` with no automatic loop and duplicate-click protection.
- Make pending, complete, and failed extraction states visible to operators.

**Dependencies**

- Steps 11, 14, and 20.

**Completion criteria**

- Procedure tests prove raw persistence happens before extraction output.
- OpenRouter failure preserves the incident and its public reference.
- Invalid output never partially updates incident fields.
- An operator can retry once per explicit action and review/edit successful output.

## Phase 8: Dashboard and UX

### Step 22: Implement deterministic manual outreach

**Objective**

Complete the first end-to-end vertical slice with an editable outreach package and accurately tracked manual actions.

**Files/modules affected**

- `packages/api/src/domain/outreach/template.ts` (create)
- `packages/api/src/domain/outreach/gates.ts` (create)
- `packages/api/src/domain/outreach/template.test.ts` (create)
- `packages/api/src/routers/operator/outreach.ts` (create)
- `packages/db/src/queries/outreach.ts`
- `apps/web/src/features/outreach/outreach-editor.tsx` (create)
- `apps/web/src/routes/_auth/incidents/$incidentId.tsx`

**Technical tasks**

- Revalidate approved facts, confidence, qualifying evidence, contradictions, and selected reviewed organization on the server.
- Build subject/body deterministically from reviewed fields, case reference, approximate time/location, both score labels/values, needs, evidence links, verification request, and exact prototype disclaimer.
- Never include raw report text or call AI for outreach.
- Implement generate, update, record-copy, record-mailto-open, and confirm-contact-attempt procedures.
- Distinguish Copy Subject from Copy Body and record each event only after the corresponding client clipboard action succeeds.
- Keep practical prefilled text below 1,500 characters; disable `mailto:` when encoded length is unsafe while preserving Copy Body.
- Opening `mailto:` changes only the outreach status/audit event, not incident state.
- Move corroborated to outreach_ready only when a valid outreach draft is generated.
- Require separate confirmation to move outreach_ready to contact_attempted.
- Emit `outreach.generated`, `outreach.subject_copied`, `outreach.body_copied`, `outreach.mailto_opened`, and `outreach.contact_attempt_confirmed` with IDs/status values only.

**Dependencies**

- Steps 17–21.

**Completion criteria**

- A fully reviewed incident can generate, edit, copy, and open a local email draft.
- Low-confidence/unapproved incidents and non-reviewed organizations are rejected server-side.
- No send endpoint or external email provider exists.
- Copy, mailto-open, and contact-confirmed events remain distinct and correctly audited.

### Step 23: Build the protected dashboard

**Objective**

Add the complete operator case list only after the vertical slice is functional.

**Files/modules affected**

- `apps/web/src/routes/_auth/dashboard.tsx`
- `apps/web/src/features/incidents/incident-list.tsx` (create)
- `apps/web/src/features/incidents/incident-filters.tsx` (create)
- `packages/api/src/routers/operator/incidents.ts`
- `packages/db/src/queries/incidents.ts`

**Technical tasks**

- Implement state and urgency filters plus text search over title and approximate location.
- Apply default order: Critical urgency, High urgency, lowest confidence within urgency, most recently updated.
- Return only list fields: title, district/location, type, urgency, confidence, state, and updated time.
- Render a table above 768 px and equivalent cards below 768 px.
- Keep search/filter state in route search parameters or local state; do not add a global state library.
- Add loading, no incidents, no filter results, API error, and retry states.
- Link rows/cards to the protected incident detail route.

**Dependencies**

- Steps 13, 14, and 22.

**Completion criteria**

- Operators can list, sort, filter, search, and open cases.
- Anonymous/forbidden clients receive no case list.
- Raw reports and organization contacts are absent from list output.
- Dashboard remains usable at 360 px and with keyboard only.

### Step 24: Complete navigation, static pages, incident composition, and accessibility

**Objective**

Finish the required public/operator information architecture and make all primary workflows consistently responsive and accessible.

**Files/modules affected**

- `apps/web/src/components/header.tsx`
- `apps/web/src/components/prototype-banner.tsx`
- `apps/web/src/routes/__root.tsx`
- `apps/web/src/routes/roadmap.tsx` (create)
- `apps/web/src/routes/privacy.tsx` (create)
- `apps/web/src/routes/index.tsx`
- `apps/web/src/routes/_auth/incidents/$incidentId.tsx`
- `apps/web/src/index.css`
- `packages/ui/src/styles/globals.css`

**Technical tasks**

- Add public navigation for project, report, roadmap, GitHub, and operator sign-in.
- Add authenticated navigation for dashboard, organizations, roadmap, GitHub, user menu, and sign-out; do not add a sidebar.
- Show the prototype banner on every public and operator page with the required no-dispatch/no-guarantee notice.
- Build Roadmap sections required by PRD section 7.9, clearly labeling Bangla and global coverage as future work.
- Build a privacy page covering data minimization, public exposure limits, prototype limits, and safe security-reporting guidance.
- Compose incident detail in the required hierarchy: status/action, facts, evidence, score breakdown, matches, outreach, and audit timeline.
- Add an `AuditTimeline` that renders safe protected events only.
- Verify 44×44 targets, visible focus, labels/legends, heading order, ARIA live updates, non-color status meaning, 200% zoom, 360 px layout, and desktop layout.
- Disable or production-gate router/query devtools.

**Dependencies**

- Steps 12, 14–16, 19, 22, and 23.

**Completion criteria**

- All required public and protected routes exist and no public incident route exists.
- Demo/prototype limits remain visible throughout the product.
- Main report and operator flows work with keyboard only at mobile and desktop widths.
- Roadmap copy keeps all postponed features explicitly outside Version 1.

## Phase 9: Testing and Deployment

### Step 25: Complete automated, procedure, privacy, and audit regression tests

**Objective**

Prove every high-risk business rule and trust boundary before release.

**Files/modules affected**

- `packages/api/src/**/*.test.ts`
- `packages/api/src/test/fixtures/*` (create)
- `packages/api/src/test/helpers/*` (create)
- `packages/api/package.json`
- `turbo.json`
- Optional focused web tests only where accessibility behavior cannot be verified reliably by domain/procedure tests

**Technical tasks**

- Complete extraction schema valid/invalid/extra-field tests.
- Complete confidence boundary, independence, contradiction, and missing-data tests.
- Complete urgency boundary tests.
- Complete matching review-status, score, order, and top-three tests.
- Complete all state transition and outreach-gate/template tests.
- Mock OpenRouter and Turnstile; never use live providers in automated tests.
- Test invalid Turnstile rejection, raw-before-generated persistence, no-session rejection, non-allowlisted rejection, explicit-only score recalculation, and approval below gate.
- Add regression assertions that public outputs/log/audit metadata exclude raw reports, outreach bodies, secrets, sessions, and organization contact data.

**Dependencies**

- Steps 7–24; focused tests should also be written alongside their earlier domain steps.

**Completion criteria**

- Every automated and procedure test listed in PRD section 15 passes.
- Tests demonstrate failure behavior, not only success paths.
- Test fixtures contain synthetic data and `.example` contact addresses only.
- `bun run test` succeeds from the repository root.

### Step 26: Deliver the open-source handoff

**Objective**

Replace scaffold-only documentation with the public project, safety, contribution, and security materials required by M15.

**Files/modules affected**

- `README.md`
- `AGENTS.md` (create)
- `CONTRIBUTING.md` (create)
- `SECURITY.md` (create)
- `LICENSE` (create, Apache-2.0)
- `CODE_OF_CONDUCT.md` (create, Contributor Covenant)
- `.github/PULL_REQUEST_TEMPLATE.md` (create)
- `.github/ISSUE_TEMPLATE/bug_report.yml` (create)
- `.github/ISSUE_TEMPLATE/feature_request.yml` (create)
- `.github/ISSUE_TEMPLATE/safety_privacy.yml` (create)
- `docs/architecture.md` (create)
- `docs/data-safety.md` (create)
- `docs/roadmap.md` (create or point to the canonical roadmap content without contradiction)

**Technical tasks**

- Give README a prototype warning, MVP scope, architecture, stack, five-step local setup, env setup, migration/seed commands, actual test/check/build commands, deployment commands, and document links.
- Put the PRD implementation contract's scope, privacy, auth, deterministic-rule, raw-first, manual-contact, and verification constraints in `AGENTS.md`.
- Document branch/commit/test/safety expectations and organization/source correction proposals in `CONTRIBUTING.md`.
- Add private security contact placeholder guidance and prohibit public issues containing incident data in `SECURITY.md`.
- Add required issue/PR templates, including a safety/privacy template that redirects sensitive reports away from public issues.
- Document proposed GitHub labels without attempting repository administration unless separately authorized.

**Dependencies**

- Steps 1–25 so documented commands and behavior are accurate.

**Completion criteria**

- Every file required by PRD section 14 exists.
- Setup commands work from a clean checkout.
- Documents consistently state that the product does not dispatch, guarantee response, or send automatically.
- No fixture or document includes real private incident or invented NGO contact data.

### Step 27: Verify migrations, release gates, smoke flow, and Vercel deployment

**Objective**

Demonstrate that the Must Have MVP works locally and under the existing one-project Vercel Services topology.

**Files/modules affected**

- `vercel.json` only if a verified deployment defect requires a minimal change
- `scripts/sync-vercel-env.ts` only if new env validation exposes a sync gap
- `package.json`
- `turbo.json`
- `README.md`
- Deployment environment configuration outside source control

**Technical tasks**

- Apply migrations to a clean Neon branch/database and run the demo organization seed.
- Run root checks using actual generated script names: formatting/lint verification, `check-types`, `test`, and `build`.
- Run `bun run deploy:check` before any upload.
- Configure preview environment values through the existing sync workflow; keep secrets out of Git.
- Deploy preview, verify same-domain `/api/auth/*` and `/api/rpc` routing, and complete the 15-step PRD smoke test at 360 px and desktop widths.
- Confirm invalid Turnstile is rejected, OpenRouter failure preserves the case, non-allowlisted users receive no operator data, and public pages expose no incident/contact data.
- Confirm `DEMO_MODE=true` before production.
- Deploy production only after preview, automated, accessibility, privacy, and smoke gates pass.

**Dependencies**

- Steps 1–26.

**Completion criteria**

- Neon migrations and seed complete successfully from documented commands.
- Lint/check, type check, tests, and build all pass.
- Preview and production use one Vercel project with the existing web/server service split.
- The complete manual flow passes: report → reference → sign-in → review → evidence → scores → approval → matches → outreach → copy/mailto fallback → contact confirmation → audit.
- All M01–M16 acceptance criteria and the PRD definition of done are satisfied with no future-scope feature added.

## Final implementation guardrails

Before accepting any implementation step, verify:

- The change maps to M01–M16 and not a Should/Could/future item.
- oRPC inputs and outputs are strictly validated.
- Operator procedures enforce session and allowlist checks on the server.
- Raw report storage precedes extraction and survives extraction failure.
- AI output is schema-validated and remains editable.
- Confidence, urgency, matching, transitions, and outreach gates are deterministic.
- Public outputs and logs contain no restricted content.
- No autonomous contact or public incident detail surface exists.
- Loading, empty, error, and success states exist for the changed workflow.
- Focus, keyboard, responsive, and non-color status behavior were checked.
- Focused tests pass before moving to the next sequential step.
