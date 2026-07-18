# Vercel Workspace Runtime Resolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Vercel Hono function resolve every internal workspace dependency to built JavaScript instead of ignored TypeScript source files.

**Architecture:** Convert the server-side internal packages (`api`, `auth`, `db`, and `env`) from runtime JIT packages into compiled ESM packages. TypeScript and local development can continue resolving source through conditional exports, while production `import` and `default` conditions resolve `dist/*.js`; Turborepo builds those dependency outputs before the server bundle, and the server-specific Vercel command selects the server plus its complete dependency graph.

**Tech Stack:** Bun workspaces, Turborepo, TypeScript 6 NodeNext ESM output, tsdown, Hono, Vercel Functions

---

## File map

- `packages/{api,auth,db,env}/package.json`: production runtime exports and package-local build tasks.
- `packages/{api,auth,db,env}/tsconfig.build.json`: Node-compatible ESM emission into `dist`.
- `packages/{api,auth,db}/src/**/*.ts`: explicit `.js` relative specifiers required by native Node ESM.
- `apps/server/tsdown.config.ts`: force all internal workspace packages into the server bundle using the current tsdown option.
- `apps/server/vercel.json`: when the Vercel project root is `apps/server`, run the root Turbo graph for `server...`.
- `apps/server/package.json`: verify the production artifact after bundling.
- `scripts/check-production-exports.ts`: regression check for TypeScript runtime targets, missing export files, extensionless emitted ESM, and leaked workspace imports.
- `package.json`: expose the production export verification command.

### Task 1: Add the failing production-resolution regression check

**Files:**
- Create: `scripts/check-production-exports.ts`
- Modify: `package.json`

- [ ] **Step 1: Add a static artifact verifier**

The verifier must:

```ts
const runtimePackages = [
  "packages/api",
  "packages/auth",
  "packages/db",
  "packages/env",
];
```

For every internal import found under `apps/server/src`, `packages/api/src`, `packages/auth/src`, and `packages/db/src`, resolve its package export using the `import` or `default` condition, substitute wildcard subpaths, and assert that:

```ts
if (/\.(?:cts|mts|tsx?|jsx?)$/.test(runtimeTarget)) {
  throw new Error(`Runtime export points to source code: ${runtimeTarget}`);
}

if (!existsSync(resolvedTarget)) {
  throw new Error(`Runtime export target is missing: ${resolvedTarget}`);
}
```

Also inspect emitted package JavaScript for extensionless relative ESM imports and inspect `apps/server/dist/index.mjs` for any remaining `@my-better-t-app/*` imports.

- [ ] **Step 2: Register the verifier**

Add this root script:

```json
"check:production-exports": "bun scripts/check-production-exports.ts"
```

- [ ] **Step 3: Run the verifier and confirm the current configuration fails**

Run:

```bash
bun run check:production-exports
```

Expected: failure identifying a runtime export such as `packages/api/src/context.ts`.

### Task 2: Compile every server runtime package

**Files:**
- Create: `packages/api/tsconfig.build.json`
- Create: `packages/auth/tsconfig.build.json`
- Create: `packages/db/tsconfig.build.json`
- Create: `packages/env/tsconfig.build.json`
- Modify: `packages/api/package.json`
- Modify: `packages/auth/package.json`
- Modify: `packages/db/package.json`
- Modify: `packages/env/package.json`

- [ ] **Step 1: Add NodeNext build configurations**

Each package receives this package-local build configuration:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "tsBuildInfoFile": "./dist/tsconfig.build.tsbuildinfo"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "dist", "node_modules"]
}
```

- [ ] **Step 2: Add package-local build scripts**

Add to each runtime package:

```json
"build": "tsc -p tsconfig.build.json"
```

This allows root `turbo run build` and `dependsOn: ["^build"]` to order:

```text
env → db → auth → api → server
```

- [ ] **Step 3: Replace runtime source exports with conditional compiled exports**

For root and wildcard exports, use source only for type checking and local development, and built JavaScript for production runtime resolution:

```json
{
  "types": "./src/index.ts",
  "development": "./src/index.ts",
  "bun": "./src/index.ts",
  "import": "./dist/index.js",
  "default": "./dist/index.js"
}
```

Use the corresponding `./src/*.ts` and `./dist/*.js` targets for wildcard exports. For `@my-better-t-app/env`, define the same condition set separately for `./server` and `./web`. Set package-level `main` and `module` to built JavaScript, while retaining the source `types` path so `bun run check-types` works before a build.

### Task 3: Make emitted ESM imports Node-compatible

**Files:**
- Modify: `packages/api/src/**/*.ts` excluding tests
- Modify: `packages/auth/src/index.ts`
- Modify: `packages/db/src/**/*.ts` excluding tests and migrations

- [ ] **Step 1: Add explicit `.js` extensions to file imports**

Examples:

```ts
import { requireOperator } from "./middleware/operator.js";
import type { Context } from "./context.js";
import { classifyError } from "../errors.js";
```

- [ ] **Step 2: Convert directory imports to explicit index files**

Use these exact directory mappings:

```text
./schema       → ./schema/index.js
../schema      → ../schema/index.js
./operator     → ./operator/index.js
./public       → ./public/index.js
```

- [ ] **Step 3: Compile packages directly**

Run:

```bash
bun run --cwd packages/env build
bun run --cwd packages/db build
bun run --cwd packages/auth build
bun run --cwd packages/api build
```

Expected: each package emits `.js`, `.d.ts`, maps, and no NodeNext extension diagnostics.

### Task 4: Make both Vercel project-root layouts build the dependency graph

**Files:**
- Create: `apps/server/vercel.json`
- Modify: `apps/server/tsdown.config.ts`
- Modify: `apps/server/package.json`
- Verify: `vercel.json`
- Verify: `turbo.json`

- [ ] **Step 1: Configure the server-root Vercel project**

Create:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "bunVersion": "1.x",
  "installCommand": "bun install --cwd ../..",
  "buildCommand": "bun run --cwd ../.. build --filter=server..."
}
```

The `server...` filter includes the server and all declared workspace dependencies. The existing root `vercel.json` remains valid for a repository-root Vercel project because its `bun run build` delegates to Turbo and builds the complete workspace graph.

- [ ] **Step 2: Migrate the deprecated tsdown dependency option**

Replace:

```ts
noExternal: [/@my-better-t-app\/.*/],
```

with:

```ts
deps: {
  alwaysBundle: [/@my-better-t-app\/.*/],
},
```

- [ ] **Step 3: Verify after the server bundle**

Add:

```json
"postbuild": "bun ../../scripts/check-production-exports.ts"
```

This makes a direct server build fail if Vercel skips dependency builds, while a correctly filtered Turbo build succeeds.

### Task 5: Install and verify the complete production graph

**Files:**
- Possible lockfile update: `bun.lock`

- [ ] **Step 1: Install workspace dependencies**

Run:

```bash
bun install
```

Expected: successful install with no workspace resolution errors.

- [ ] **Step 2: Run all TypeScript checks**

Run:

```bash
bun run check-types
```

Expected: all workspace type checks pass with strict mode unchanged.

- [ ] **Step 3: Run the production build**

Run:

```bash
bun run build
```

Expected: package builds precede the server; the server postbuild verifier passes.

- [ ] **Step 4: Run focused tests and uncached artifact verification**

Run:

```bash
bun run --cwd packages/auth test
bun run --cwd packages/api test
bun run --cwd apps/server test
bun run check:production-exports
```

Expected: all tests and the production-resolution verifier pass.

- [ ] **Step 5: Inspect the final artifacts**

Confirm:

```text
packages/api/dist/context.js exists
packages/auth/dist/index.js exists
packages/db/dist/index.js exists
packages/env/dist/server.js exists
apps/server/dist/index.mjs contains no runtime @my-better-t-app imports
all emitted relative ESM imports include file extensions
```

