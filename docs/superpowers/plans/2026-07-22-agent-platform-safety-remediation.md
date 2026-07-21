# Agent Platform Safety Remediation Implementation Plan

> **For agentic workers:** Implement this plan inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the reviewed approval, queue, correlation, migration, and voice-call safety gaps before monitoring or live outreach is enabled.

**Architecture:** Preserve the existing agent/orchestrator boundaries. Put state invariants and atomic claims in database queries, keep agent routing in the pipeline, and keep Hono/oRPC handlers as validation and orchestration boundaries. Use observation IDs as immutable assessment revisions so later evidence can safely enqueue fresh work.

**Tech Stack:** TypeScript 6, Drizzle ORM, Neon PostgreSQL, oRPC, Hono, Vitest, Bun, Turborepo.

---

## File structure

- `packages/db/src/queries/incidents.ts`: approval invalidation, guarded agent writes, report creation.
- `packages/db/src/queries/evidence.ts`: atomic evidence mutation plus approval invalidation.
- `packages/db/src/queries/monitoring.ts`: atomic observation insertion and correlation enqueue.
- `packages/db/src/queries/contact-attempts.ts`: voice-attempt claim, start, and failure transitions.
- `packages/api/src/agents/pipeline.ts`: revision-aware jobs and user-report correlation flow.
- `packages/api/src/agents/orchestrator.ts`: lease-safe one-at-a-time job processing.
- `packages/api/src/routers/operator/contact.ts`: claim-before-provider call and compensation.
- `apps/server/src/index.ts`: complete Vapi terminal-status mapping.
- `packages/db/src/migrations/0001_lyrical_captain_stacy.sql`: approved-row backfill.
- Focused `*.test.ts` files beside the API modules above: regression coverage for each invariant.

### Task 1: Protect and invalidate operator approval

- [x] Add regression tests proving delayed verification/priority writes cannot update approved incidents.
- [x] Guard `updateIncidentAgentAssessment` with `facts_approved = false`.
- [x] Add regression tests proving incident edits and operator evidence changes invalidate approval.
- [x] On a real fact/evidence change, set `factsApproved=false`, `verificationStatus='agent_review'`, and move an approved response workflow back to `reviewing`; audit the edit/evidence event in the same database batch.
- [x] Run `bun run --cwd packages/api test` and confirm the new tests pass.

### Task 2: Make observation processing durable and revision-aware

- [x] Add a database helper that inserts an observation and its `correlation:<observationId>` job in one Neon transaction; return null only for a duplicate observation.
- [x] Change monitoring to use the atomic helper so a persisted observation never loses its correlation job.
- [x] Route public reports through correlation instead of pre-linking a newly created incident.
- [x] Use `verification:<incidentId>:<observationId>` and `priority:<incidentId>:<observationId>` keys so later observations trigger reassessment while retries stay idempotent.
- [x] If a new observation correlates with an existing incident, enqueue classification for that observation and allow it to refresh only unapproved facts.
- [x] Add focused tests for duplicate retry recovery, public-report correlation, and revision-aware keys.

### Task 3: Preserve existing data and accept repeated report text

- [x] Backfill `verification_status='operator_approved'` for existing `facts_approved=true` rows immediately after the column is added.
- [x] Keep community-report external IDs unique per receipt and derive the content hash from the receipt reference plus report text, so identical descriptions are separate reports.
- [x] Add regression coverage proving two identical report bodies can both be accepted.
- [x] Run `bunx drizzle-kit check --config drizzle.config.ts` and inspect the SQL diff.

### Task 4: Make voice execution single-claim and failure-safe

- [x] Add a conditional `approved -> queued` database claim that returns call context only to one concurrent starter.
- [x] Call Vapi only after the claim succeeds; on provider failure, persist `failed`; on success, transition `queued -> in_progress` with provider ID.
- [x] Treat all documented Vapi error-like terminal reasons as failed, with successful terminal reasons completed.
- [x] Add route and webhook-outcome tests for concurrent-start rejection, provider failure compensation, and terminal outcome mapping.

### Task 5: Harden operations and verify

- [x] Reject enabling connector types that have no implementation (`community`, `ffwc`, `rss`) through the operator mutation.
- [x] Claim and process one workflow job at a time so no queued lease expires behind a slow external call.
- [x] Remove the USGS place-name requirement and rely on the Bangladesh bounding box.
- [x] Run `bun run check:ci`, `bun run check-types`, `bun run test`, `bun run build`, `git diff --check`, and Drizzle schema validation.
- [x] Review the final diff for unrelated edits, secrets, raw-report leakage, and accidentally enabled live flags.
