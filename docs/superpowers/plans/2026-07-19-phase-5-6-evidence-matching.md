# Phase 5–6 Evidence and NGO Matching Implementation Plan

> **For agentic workers:** Implement this plan inline, task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete protected evidence management, deterministic confidence/urgency scoring, fact approval gates, reviewed-organization matching, and the operator UI required by Phases 5 and 6.

**Architecture:** Keep oRPC routers as protected orchestration boundaries, pure rules under `packages/api/src/domain`, persistence under `packages/db/src/queries`, and responsive React composition under `apps/web/src/features`. Reuse the existing incident, evidence, organization, match, and audit tables; generate a Drizzle migration only if the schema changes.

**Tech Stack:** TypeScript 6, Zod 4, oRPC, Drizzle ORM/Neon PostgreSQL, React 19, TanStack Query/Router, Tailwind CSS 4, Vitest.

---

## File structure

- `packages/api/src/domain/evidence/schema.ts`: strict evidence input validation and controlled values.
- `packages/api/src/domain/scoring/{types,confidence,urgency}.ts`: pure scores, labels, and accessible breakdowns.
- `packages/api/src/domain/incidents/approval.ts`: reusable approval/outreach gate evaluation.
- `packages/api/src/domain/matching/{sector-map,match-organizations}.ts`: exact PRD sector mapping and stable top-three matching.
- `packages/api/src/routers/operator/{evidence,score,match,organizations}.ts`: protected Phase 5–6 contracts.
- `packages/api/src/routers/operator/incidents.ts`: fact-approval mutation.
- `packages/db/src/queries/{evidence,incidents,matches,organizations}.ts`: incident-scoped writes and reads.
- `apps/web/src/features/evidence/*`: evidence form and protected evidence list.
- `apps/web/src/features/incidents/{score-panel,approval-gate}.tsx`: explicit recalculation and approval UI.
- `apps/web/src/features/organizations/*`: registry list and incident match cards.
- `apps/web/src/routes/_auth/organizations.tsx`: protected read-only registry route.
- `apps/web/src/features/incidents/incident-detail.tsx`: required facts → evidence → scores → approval → matches composition.

### Task 1: Add pure Phase 5 rules

- [ ] Add strict evidence validation:

```ts
z.object({
  incidentId: z.uuid(),
  url: z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol)),
  sourceName: z.string().trim().min(2).max(160),
  sourceCategory: z.enum(EVIDENCE_SOURCE_CATEGORIES),
  relationship: z.enum(EVIDENCE_RELATIONSHIPS),
  isIndependent: z.boolean(),
  note: z.string().trim().max(500).nullable().optional(),
  publishedAt: z.iso.datetime().nullable().optional(),
}).strict()
```

- [ ] Implement confidence exactly as `highest supporting base + 20 second independent + 10 third independent - 30 credible contradiction - 10 missing location - 10 missing time`, clamped to 0–100.
- [ ] Implement urgency exactly as `35 trapped + 25 medical + 20 water + 20 displacement + 15 food + 10 vulnerable + 10 blocked`, clamped to 0–100.
- [ ] Return labels and human-readable breakdown entries from both pure functions.
- [ ] Add boundary, independence, contradiction, missing-data, clamp, and label tests.

Run: `bun run --cwd packages/api test src/domain/scoring`

Expected: all scoring tests pass.

### Task 2: Add evidence and score persistence/procedures

- [ ] Add protected evidence `list`, `create`, and incident-scoped `remove` procedures.
- [ ] Derive `publisherDomain` with `new URL(url).hostname.toLowerCase()` only on the server.
- [ ] Record `evidence.added` and `evidence.removed` with safe IDs/category/relationship metadata only.
- [ ] Add explicit protected score recalculation that reads current incident/evidence, persists both scores, and records `scores.calculated`.
- [ ] Ensure evidence writes never invoke score recalculation.
- [ ] Add procedure tests for validation, server-derived domain, incident scoping, audits, and explicit-only recalculation.

Run: `bun run --cwd packages/api test src/routers/operator/evidence.test.ts src/routers/operator/score.test.ts`

Expected: protected Phase 5 procedure tests pass.

### Task 3: Enforce fact approval

- [ ] Evaluate the gate from freshly read incident/evidence and freshly calculated confidence.
- [ ] Require supporting evidence, confidence ≥70, one supporting source worth ≥40, no credible contradiction, reviewing state, and explicit confirmation.
- [ ] Atomically persist recalculated scores, approval actor/time, `reviewing → corroborated`, `incident.facts_approved`, and `incident.state_changed`.
- [ ] Treat an already-approved corroborated incident as an idempotent success without duplicate audit events.
- [ ] Add pure gate and protected procedure tests for every failed condition and the success path.

Run: `bun run --cwd packages/api test src/domain/incidents/approval.test.ts src/routers/operator/incidents.test.ts`

Expected: approval cannot bypass any server gate.

### Task 4: Add pure matching and protected registry/match procedures

- [ ] Map needs to the exact PRD sectors; `other` has no invented mapping.
- [ ] Exclude non-reviewed organizations and unsafe demo contacts before scoring.
- [ ] Score `40 first sector + 10 each additional (max 20) + 25 district + 15 division + 10 country + 5 contact`, clamped to 100.
- [ ] Sort by descending score, then organization name and ID; retain at most three.
- [ ] Re-evaluate the outreach confidence gate before generating matches, persist replacements, and audit only count/scores.
- [ ] Return `availability: "Unknown in Version 1"` and the demo flag.
- [ ] Add a protected read-only organization list with no mutations.
- [ ] Add exact scoring, exclusion, stable tie, top-three, empty-result, and procedure authorization/gate tests.

Run: `bun run --cwd packages/api test src/domain/matching src/routers/operator/match.test.ts src/routers/operator/organizations.test.ts`

Expected: only safe reviewed candidates can be returned.

### Task 5: Build the protected responsive UI

- [ ] Add an evidence form with visible labels, HTTP/HTTPS validation, optional time/note, relationship text, and explicit independence guidance.
- [ ] Add an evidence list with Supports/Contradicts/Context Only text and incident-scoped remove controls.
- [ ] Add a score panel with numeric values, labels, breakdown text, stale-score warning, and explicit recalculation.
- [ ] Add an approval checklist and required review-confirmation checkbox.
- [ ] Add match generation and top-three cards with reasons, contact-present/absent, `Unknown in Version 1`, and visible Demo text.
- [ ] Add a protected read-only organizations route and responsive registry cards.
- [ ] Invalidate protected queries after successful mutations and provide loading, empty, error, retry, pending, and ARIA-live states.

Run: `bun run --cwd apps/web check-types`

Expected: Vite route generation and TypeScript checks pass.

### Task 6: Verify migrations and release gates

- [ ] Run Drizzle generation and inspect the output. Keep no empty or unrelated migration; retain a generated migration only if Phase 5–6 schema changes require it.
- [ ] Run formatting/lint verification, type checks, tests, production-export checks, and builds.
- [ ] Fix every failure attributable to the implementation and inspect the final diff for secrets, raw-report leakage, unauthorized public procedures, or deployment changes.

Run:

```text
bun run db:generate
bun run check:ci
bun run check-types
bun run test
bun run check:production-exports
bun run build
```

Expected: all commands pass; deployment configuration remains unchanged.
