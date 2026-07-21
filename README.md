# Rapid Humanitarian Response Platform

An open-source, Bangladesh-first AI agent platform for detecting, verifying, and
prioritizing emergency incidents while keeping external response actions under
human control. See [the agent platform architecture](docs/agent-platform.md) for
the workflow, safety gates, and activation runbook.

The application uses Better-T-Stack with React, TanStack Router, Hono, oRPC,
Drizzle, Neon Postgres, and a durable multi-agent workflow.

## Features

- **TypeScript** - For type safety and improved developer experience
- **TanStack Router** - File-based routing with full type safety
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Hono** - Lightweight, performant server framework
- **oRPC** - End-to-end type-safe APIs with OpenAPI integration
- **Bun** - Runtime environment
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Biome** - Linting and formatting
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Copy `apps/server/.env.example` to `apps/server/.env` and provide local values.
3. Choose the schema workflow for the target database:

For a disposable local development database, schema push is available:

```bash
bun run db:push
```

For shared, preview, and production databases, generate and apply committed migrations:

```bash
bun run db:generate
bun run db:migrate
```

Do not use `db:push` against production. Seed the idempotent Bangladesh
administrative areas, disabled monitoring-source registry, and fictional demo
organization after the schema exists:

```bash
bun run db:seed
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
The API is running at [http://localhost:3000](http://localhost:3000).

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@my-better-t-app/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Deployment

### Vercel Services

- Target: web + server
- Config: `vercel.json`
- Link the project first: bun run deploy:setup
- Local Vercel dev: bun run dev:vercel
- Sync preview env: bun run env:preview
- Sync production env: bun run env:production
- Dry-run check (no upload): bun run deploy:check
- Preview deploy: bun run deploy
- Production deploy: bun run deploy:prod
- Web requests under `/api/*` route to the server service and are rewritten before reaching the backend.
  Vercel Services share project environment variables, but deploys do not upload local `.env` files automatically. Link the project with `vercel link`, then run the env sync command before your first deploy (otherwise the deployment starts with no env vars), or pass one-off envs with `vercel deploy -e KEY=value`.
  Pass Vercel CLI flags to the env sync command directly, for example: `bun run env:production --scope your-team`.

For more details, see the guide on [Deploying to Vercel](https://www.better-t-stack.dev/docs/guides/vercel).

## Git Hooks and Formatting

- Apply safe formatting fixes: `bun run check`
- Run the non-mutating backend CI check: `bun run check:ci`

## Quality Gates

Run these commands from the repository root:

```bash
bun install
bun run check:ci
bun run check-types
bun run test
bun run build
bun run db:generate
bun run deploy:check
```

`deploy:check` requires the repository to be linked to the intended Vercel
project. Database generation updates committed migration artifacts. Migration
application and seeding write to the database configured by `DATABASE_URL`.

## Project Structure

```
my-better-t-app/
├── apps/
│   ├── web/         # Frontend application (React + TanStack Router)
│   └── server/      # Backend API (Hono, ORPC)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles
│   ├── api/         # API layer / business logic
│   ├── auth/        # Authentication configuration & logic
│   └── db/          # Database schema & queries
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run dev:server`: Start only the server
- `bun run check-types`: Check TypeScript types across all apps
- `bun run test`: Run package-owned tests through Turborepo
- `bun run db:push`: Push schema changes to database
- `bun run db:generate`: Generate Drizzle SQL migrations
- `bun run db:migrate`: Run database migrations
- `bun run db:seed`: Upsert fictional demo organization records
- `bun run db:studio`: Open database studio UI
- `bun run check`: Run Biome formatting and linting
- `bun run check:ci`: Run non-mutating backend and changed-route checks
- `bun run deploy:setup`: Link this repo to a Vercel project (first-time setup)
- `bun run dev:vercel`: Run the Vercel Services dev environment locally
- `bun run env:preview`: Sync local env files to the Vercel preview environment
- `bun run env:production`: Sync local env files to the Vercel production environment
- `bun run deploy`: Create a Vercel preview deployment
- `bun run deploy:prod`: Deploy to Vercel production
- `bun run deploy:check`: Dry-run a deploy to preview framework detection and included files without uploading
