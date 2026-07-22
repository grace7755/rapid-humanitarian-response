# Remove Vercel Connection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove this repository's remaining local and external Vercel links so future pushes run only the repository's GitHub Actions CI check.

**Architecture:** The tracked Vercel deployment configuration was already removed in commit `714fb49`, so no application code needs to change. Cleanup is limited to ignored local Vercel metadata, the two Vercel projects' Git repository connections, and repository-scoped GitHub App access; existing unrelated working-tree changes must remain untouched.

**Tech Stack:** Git, GitHub Actions, Vercel project settings, Bun monorepo

---

### Task 1: Confirm the tracked repository is Vercel-free

**Files:**
- Inspect: `.github/workflows/ci.yml`
- Inspect: `package.json`
- Inspect: `apps/web/package.json`
- Inspect: `apps/server/package.json`

- [x] **Step 1: Search tracked files for Vercel configuration**

Run:

```powershell
git ls-files | rg -i "vercel|now\.json|\.vercel"
rg -n -i "vercel|@vercel|VERCEL_" . --hidden --glob '!node_modules/**' --glob '!**/.git/**'
```

Expected: no tracked Vercel deployment file, script, dependency, or environment-variable reference; only `.vercel` ignore rules may match.

- [x] **Step 2: Confirm GitHub Actions contains only project validation**

Run:

```powershell
Get-Content -Raw .github\workflows\ci.yml
```

Expected: the workflow installs dependencies and runs quality, type, test, and build checks without invoking Vercel.

### Task 2: Remove local Vercel links and generated output

**Files:**
- Delete locally: `.vercel/`
- Delete locally: `apps/server/.vercel/`
- Preserve: `.gitignore`
- Preserve: `apps/server/.gitignore`
- Preserve: `apps/web/.gitignore`

- [x] **Step 1: Validate the exact cleanup targets**

Run:

```powershell
Resolve-Path -LiteralPath .vercel,apps\server\.vercel
git check-ignore -v .vercel\project.json apps\server\.vercel\project.json
```

Expected: both paths resolve inside this workspace and both project files are ignored by Git.

- [x] **Step 2: Delete the local links**

Run:

```powershell
Remove-Item -LiteralPath .vercel,apps\server\.vercel -Recurse -Force
```

Expected: both directories are absent. They can only be recreated by deliberately running `vercel link` or a Vercel build command.

### Task 3: Disconnect external deployment checks

**Files:**
- No repository file changes

- [ ] **Step 1: Disconnect the Git repository in each Vercel project**

In each of the `rapid-humanitarian-response-web` and `rapid-humanitarian-response-server` Vercel projects, open **Settings → Git**, choose **Disconnect**, and confirm. Preserve the projects unless project deletion is separately intended.

Expected: pushes to `grace7755/rapid-humanitarian-response` no longer create Vercel deployments or Vercel commit checks.

- [ ] **Step 2: Restrict the Vercel GitHub App installation**

Open GitHub **Settings → Applications → Installed GitHub Apps → Vercel → Configure** and remove `grace7755/rapid-humanitarian-response` from repository access. Uninstall the app only if no other repository uses Vercel.

Expected: Vercel no longer has access to this repository while unrelated repository integrations remain intact.

### Task 4: Verify repository health

**Files:**
- No expected source changes

- [x] **Step 1: Verify the cleanup**

Run:

```powershell
Test-Path -LiteralPath .vercel,apps\server\.vercel
git status --short
```

Expected: both path checks return `False`, and pre-existing source changes remain unchanged.

- [x] **Step 2: Run the same validation used by GitHub Actions**

Run:

```powershell
bun install --frozen-lockfile
bun run check:ci
bun run check-types
bun run test
bun run build
```

Expected: every command exits with status 0. A later push should show only `CI / validate (push)`; historical Vercel failures remain visible on old commits but no new Vercel checks should be created.
