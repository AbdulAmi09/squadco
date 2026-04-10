# TrustLayer AI

TrustLayer AI is a multi-tenant financial intelligence platform for banks and fintechs. This monorepo contains:

- `apps/web`: Next.js 14 dashboard for TrustLayer super admins and bank teams
- `apps/api`: Express + TypeScript API for internal dashboard routes and external bank integrations
- `apps/ai-engine`: FastAPI service for risk scoring, credit scoring, statement parsing, and LLM explanations
- `packages/sdk`: TypeScript SDK for bank integrations
- `packages/shared`: shared types and constants
- `supabase`: SQL migrations and seed data

## Local services

- Web dashboard: `http://localhost:3000`
- Node API: `http://localhost:3001`
- Python AI engine: `http://localhost:8000`

## Deployment split

The repository is intentionally split for deployment:

- `apps/ai-engine` is a standalone AI service and can be deployed independently to Render.
- `apps/api` is the dashboard/control API and should call the AI service through `AI_ENGINE_URL`.
- `apps/web` is the frontend dashboard and talks to `apps/api`.

This keeps the AI engine independently deployable and replaceable.

## Setup

1. Copy `.env.example` to `.env` and fill in secrets, including a PostgreSQL `DATABASE_URL` for Prisma.
2. Run Supabase migrations and seed data.
3. Install workspace dependencies with `npm install`.
4. Create a Python 3.11 environment in `apps/ai-engine` and install `requirements.txt`.
5. Run the AI engine, API, and web app separately.

## Non-auth email

TrustLayer uses Resend for operational emails that should not be sent through Supabase Auth, such as:

- bank admin organization invites
- bank team invites
- future operational notifications

Configure these env vars in the API service:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `APP_BASE_URL`

## Build order

The repository follows the requested build order:

1. Supabase migration and seed
2. Python AI engine
3. Node API
4. Next.js dashboard
5. SDK
