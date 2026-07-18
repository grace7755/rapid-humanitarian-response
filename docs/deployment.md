# Deployment

The monorepo deploys the frontend and backend as separate Vercel projects from
the same GitHub repository.

## Vercel projects

| Service | Vercel project | Root directory | Framework |
| --- | --- | --- | --- |
| Frontend | `rapid-humanitarian-response-web` | `apps/web` | Vite |
| Backend | `rapid-humanitarian-response-server` | `apps/server` | Hono |

Both projects use `main` as the production branch. Pull requests create Preview
deployments, while pushes to `main` create Production deployments. The projects
must remain separate.

## Environment variables

Configure values in the corresponding Vercel project. Never commit production
values or secrets.

Frontend:

- Required: `VITE_SERVER_URL`, `VITE_TURNSTILE_SITE_KEY`
- Optional: `VITE_APP_NAME`, `VITE_GITHUB_URL`, `VITE_DEMO_MODE`

Backend:

- Required: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `CORS_ORIGIN`
- Optional: `OPERATOR_EMAIL_ALLOWLIST`, `OPENROUTER_API_KEY`,
  `OPENROUTER_MODEL`, `OPENROUTER_APP_NAME`, `OPENROUTER_APP_URL`,
  `TURNSTILE_SECRET_KEY`, `DEMO_MODE`

`VITE_SERVER_URL` must point to the backend deployment. `CORS_ORIGIN` must allow
the frontend origin.

## Deployment flow

1. A pull request runs `.github/workflows/ci.yml` and creates Vercel Preview
   deployments.
2. CI installs the root Bun workspace and runs type checks, tests, and builds
   through Turborepo.
3. After changes merge, a push to `main` reruns CI and both Vercel projects
   create their Production deployments.
4. Deployment settings and environment variables are managed independently in
   each Vercel project.
