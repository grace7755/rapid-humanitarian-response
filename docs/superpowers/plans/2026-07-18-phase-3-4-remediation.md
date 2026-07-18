# Phase 3 & 4 Remediation Implementation Plan

> **For agentic workers:** Execute this plan task-by-task in the current session. Do not delegate work or rewrite existing subsystems.

**Goal:** Resolve the confirmed Phase 3 and Phase 4 migration, configuration, consistency, validation, privacy, accessibility, and verification findings with small, testable changes.

**Architecture:** Keep the existing Turborepo, Hono/oRPC, Drizzle/Neon HTTP, TanStack Router, and React structure. Put database writes in the database query layer, use Neon HTTP batch transactions for atomic update/audit pairs, keep public and protected navigation at their respective route-layout boundaries, and share server validation schemas with the operator form where practical.

**Tech Stack:** Bun, Turborepo, TypeScript, Zod, Drizzle ORM, Neon serverless Postgres, oRPC, TanStack Query/Router, React, Vitest, Biome.

---

### Task 1: Verify migration and environment prerequisites

**Files:**
- Verify: `packages/db/drizzle.config.ts`
- Verify: `packages/db/src/migrations/`
- Verify: `packages/db/src/schema/`
- Modify: `packages/env/src/server.ts`
- Verify: `apps/server/.env.example`
- Verify: `apps/web/.env.example`

- [ ] Confirm the migration journal points to the complete baseline migration and the configured database contains every domain table, constraint, index, and migration-history row.
- [ ] Run `bun run db:migrate`; expect a successful no-op on an up-to-date database.
- [ ] Require a non-empty operator allowlist and Turnstile secret in production while retaining optional local-development configuration.
- [ ] Keep examples as placeholders only; never write real credentials.

### Task 2: Make report verification retryable

**Files:**
- Modify: `apps/web/src/features/reports/incident-form.tsx`
- Modify: `apps/web/src/features/reports/turnstile-widget.tsx`

- [ ] Add a reset generation passed from the form to the widget.
- [ ] After every failed mutation, clear only `turnstileToken`, increment the generation, and preserve every reporter-entered field.
- [ ] Reset the rendered Turnstile instance when the generation changes and clear tokens on widget error/expiry.

### Task 3: Make operator mutations and audit writes atomic

**Files:**
- Modify: `packages/db/src/queries/incidents.ts`
- Modify: `packages/api/src/routers/operator/incidents.ts`
- Modify: `packages/api/src/services/audit.ts`
- Test: `packages/api/src/routers/operator/incidents.test.ts`
- Test: `packages/api/src/services/audit.test.ts`

- [ ] Replace separate mutation/audit calls with database-layer Neon HTTP batch transactions.
- [ ] Couple audit inserts to the mutation timestamp so a failed optimistic update cannot create an audit record.
- [ ] Emit both review-start audit events in the same transaction.
- [ ] Record only a comma-separated allowlisted `changedFields` value for reviewed edits.

### Task 4: Strengthen operator validation

**Files:**
- Modify: `packages/api/src/routers/operator/incidents.ts`
- Test: `packages/api/src/routers/operator/incidents.test.ts`

- [ ] Bound `affectedEstimate` to PostgreSQL `integer` maximum `2_147_483_647`.
- [ ] Reject duplicate needs and duplicate unknown values.
- [ ] Export and test the reviewed-fields schema without weakening strict validation.

### Task 5: Separate public and protected navigation

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`
- Modify: `apps/web/src/routes/_auth/route.tsx`
- Modify: `apps/web/src/components/header.tsx`
- Modify: `apps/web/src/components/user-menu.tsx`

- [ ] Render only public navigation and theme controls at the root.
- [ ] Render the dashboard link and authenticated user menu only inside the protected layout.
- [ ] Pass the already-loaded protected session into the user menu instead of issuing a public-page session request.

### Task 6: Add accessible validation and distinct error states

**Files:**
- Modify: `apps/web/src/features/reports/incident-form.tsx`
- Modify: `apps/web/src/features/incidents/incident-review-form.tsx`
- Modify: `apps/web/src/features/incidents/incident-detail.tsx`
- Modify: `apps/web/src/components/score-badge.tsx`

- [ ] Give each invalid control an error element ID and an `aria-describedby` association.
- [ ] Make needs a semantic fieldset with a valid `#needs` summary target.
- [ ] Validate reviewed fields before mutation, focus an accessible summary, and preserve dirty values on failure.
- [ ] Distinguish not-found, forbidden/unauthorized, and retryable service failures using `isInferableError`.
- [ ] Remove ARIA attributes unsupported by generic `span` and `div` elements.

### Task 7: Verify and deliver

**Files:**
- Format only files in the configured CI scope.

- [ ] Run focused tests while implementing.
- [ ] Run `bun run check-types`, `bun run test`, `bun run build`, and `bun run check:ci`.
- [ ] Inspect `git diff --check` and the final diff for secrets or unrelated behavior changes.
- [ ] Create small scoped commits only after each group passes its relevant checks.
