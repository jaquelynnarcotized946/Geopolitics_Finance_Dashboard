# GeoPulse Intelligence - Setup and Deployment Guide

## Prerequisites

- Node.js 20+ and npm
- A Supabase Postgres database
- Git

This repository is already configured for Prisma + Supabase PostgreSQL. It is not a SQLite app anymore.

---

## Quick Start

```bash
git clone <repo-url> GPF_Dashboard
cd GPF_Dashboard
npm install
cp .env.example .env
```

Fill in `.env`, then apply the existing Prisma migrations:

```bash
npx prisma migrate deploy
npm run dev
```

The app runs at `http://localhost:3000`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Supabase PostgreSQL
# Runtime connection for serverless app traffic
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct/session connection for Prisma migrations
DIRECT_URL="postgresql://...pooler.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret"

# Cron ingestion
CRON_SECRET="generate-a-random-secret"
```

Notes:

- Use the Supabase transaction pooler on port `6543` for `DATABASE_URL`.
- Use the Supabase session/direct connection on port `5432` for `DIRECT_URL`.
- On Vercel, set `NEXTAUTH_URL` to your deployed domain.

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Setup

The repo already contains Prisma migrations in `prisma/migrations`.

Use these commands:

```bash
# Apply checked-in migrations
npx prisma migrate deploy

# Regenerate the client after schema changes
npx prisma generate
```

When you change `prisma/schema.prisma` during development:

```bash
npx prisma migrate dev --name your_change_name
```

Useful commands:

```bash
npx prisma studio
npm run seed
```

---

## Development Workflow

```bash
npm run dev
npm run typecheck
npm run build
```

Notes:

- `npm run lint` currently aliases to TypeScript type-checking.
- `npm run build` runs `prisma generate` and then `next build`.

---

## Manual Ingestion

Authenticated users can trigger ingestion through the UI or the protected API:

```bash
curl -X POST http://localhost:3000/api/sync \
  --cookie "<authenticated-session-cookie>"
```

For cron-style ingestion:

```bash
curl -X POST http://localhost:3000/api/cron/ingest \
  -H "Authorization: Bearer <CRON_SECRET>"
```

The Settings page now uses `/api/sync`, so you do not need to expose any public cron secret to the browser.

---

## Deploying to Vercel

### 1. Import the repository into Vercel

Vercel will detect this as a Next.js project automatically.

### 2. Add environment variables

Add these in the Vercel project settings:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`

Recommended values:

- `DATABASE_URL`: Supabase transaction pooler, port `6543`
- `DIRECT_URL`: Supabase session/direct connection, port `5432`
- `NEXTAUTH_URL`: `https://your-project.vercel.app` or your custom domain

### 3. Run production migrations

Before the first production deployment, apply the checked-in migrations to Supabase:

```bash
npx prisma migrate deploy
```

Do this from your machine or CI against the production database. Do not rely on the Vercel runtime to create tables on first request.

### 4. Deploy

Once the env vars are present and migrations are applied, a normal Vercel deployment should build successfully.

---

## Vercel Cron Behavior

This repo includes `vercel.json` with a cron job targeting:

```text
/api/cron/ingest
```

The default schedule in this repo is:

```text
0 6 * * *
```

That once-daily schedule is chosen because Vercel Hobby cron jobs support only daily execution. If you are on a paid Vercel plan and want ingestion every 2 hours, change the schedule back to:

```text
0 */2 * * *
```

Vercel cron requests are authenticated with the `CRON_SECRET` bearer token.

---

## Self-Hosted Deployments

For a long-running VPS or container deployment:

```bash
npm install
npx prisma migrate deploy
npm run build
npm start
```

In self-hosted environments, the in-process scheduler can still run outside Vercel. On Vercel, the app uses `vercel.json` cron jobs instead.

---

## Troubleshooting

### Vercel deployment fails before build starts

Check `vercel.json`. Unsupported cron schedules on Hobby plans can block deployment. This repo now uses a Hobby-safe daily schedule by default.

### Build succeeds locally but auth fails on Vercel

Check `NEXTAUTH_URL` and `NEXTAUTH_SECRET`. `NEXTAUTH_URL` must match the deployed domain you are actually using.

### App deploys but database calls fail

Check that:

- `DATABASE_URL` points to the Supabase transaction pooler on port `6543`
- `DIRECT_URL` points to the Supabase direct/session connection on port `5432`
- `npx prisma migrate deploy` has already been run against the target database

### Manual ingestion from Settings fails

That route should use `/api/sync` and requires an authenticated session. If it still fails, verify you are signed in and that the database connection works.
