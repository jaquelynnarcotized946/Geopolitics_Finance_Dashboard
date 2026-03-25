# GeoPulse Intelligence — Setup & Deployment Guide

## Prerequisites

- **Node.js** 18.x or later (LTS recommended)
- **npm** 9.x or later (comes with Node.js)
- **Git** for version control

No API keys, no cloud accounts, no paid services required.

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> GPF_Dashboard
cd GPF_Dashboard

# 2. Install dependencies
npm install

# 3. Generate Prisma client
npx prisma generate

# 4. Create database and run migrations
npx prisma migrate dev

# 5. Start development server
npm run dev
```

The app will be running at **http://localhost:3000**.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Required: NextAuth configuration
NEXTAUTH_SECRET="your-random-secret-string-here"
NEXTAUTH_URL="http://localhost:3000"

# Required: Database
DATABASE_URL="file:./dev.db"

# Optional: Cron ingestion secret (for automated ingestion)
CRON_SECRET="your-cron-secret-here"
```

### Generating NEXTAUTH_SECRET

```bash
# Option 1: Using openssl
openssl rand -base64 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Database Setup

### Initial Migration

```bash
# Create database and apply all migrations
npx prisma migrate dev
```

This creates `prisma/dev.db` (SQLite file) with all 9 tables.

### Seed Test Data

After migration, create a test user account:

1. Start the dev server: `npm run dev`
2. Navigate to http://localhost:3000/auth/signup
3. Create account with:
   - **Email:** test@geopulse.dev
   - **Password:** testpass123
   - **Name:** Test User

Or use the existing test credentials if the database is already seeded.

### Initial Data Ingestion

After creating an account, trigger the first data ingestion:

```bash
# Option 1: Via API (if CRON_SECRET is set)
curl -X POST http://localhost:3000/api/cron/ingest \
  -H "Authorization: Bearer your-cron-secret-here"

# Option 2: Via the Settings page
# Login → Settings → Click "Sync Now"

# Option 3: Via the /api/sync endpoint (requires auth session)
# Login first, then visit http://localhost:3000/api/sync in browser
```

First ingestion takes 30-90 seconds and fetches from all 50+ RSS feeds + GDELT.

---

## Development

### Start Dev Server

```bash
npm run dev
```

Runs on **http://localhost:3000** with Turbopack for fast refresh.

### Type Checking

```bash
npx tsc --noEmit
```

Should show zero errors on a clean build.

### Prisma Studio

Visual database browser:

```bash
npx prisma studio
```

Opens at **http://localhost:5555** — browse and edit all database tables.

### Common Development Commands

```bash
# Install a new package
npm install <package-name>

# After changing prisma/schema.prisma:
npx prisma generate          # Regenerate client
npx prisma migrate dev       # Create migration

# Reset database (deletes all data)
npx prisma migrate reset

# Check TypeScript errors
npx tsc --noEmit
```

---

## Project Structure

```
GPF_Dashboard/
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── dev.db              # SQLite database (generated)
│   └── migrations/         # Migration history
├── config/
│   └── feeds.json          # RSS feed configuration
├── src/
│   ├── pages/              # Next.js pages (15 routes)
│   │   ├── api/            # API endpoints (15 routes)
│   │   └── ...
│   ├── components/         # React components
│   ├── lib/                # Business logic
│   │   ├── hooks/          # SWR data hooks
│   │   ├── sources/        # Data source clients
│   │   ├── correlation/    # Correlation engine
│   │   ├── ingest/         # Ingestion pipeline
│   │   ├── scoring/        # Severity scoring
│   │   └── analysis/       # Sentiment analysis
│   └── types/              # TypeScript declarations
├── docs/                   # This documentation
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── postcss.config.mjs
```

---

## Production Build

### Build for Production

```bash
npm run build
```

Creates an optimized production build in `.next/`.

### Start Production Server

```bash
npm start
```

Runs the production build on **http://localhost:3000**.

---

## Deployment Options

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

**Note:** SQLite doesn't persist on Vercel's serverless functions. For production, migrate to:
- **Vercel Postgres** or **Supabase** (free tier available)
- Update `schema.prisma` to use `postgresql` provider

### Self-Hosted (VPS)

```bash
# On your server:
git clone <repo-url>
cd GPF_Dashboard
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

Use **PM2** for process management:

```bash
npm install -g pm2
pm2 start npm --name "geopulse" -- start
pm2 save
pm2 startup
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Automated Ingestion

### Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest",
      "schedule": "0 */2 * * *"
    }
  ]
}
```

Runs every 2 hours. Requires `CRON_SECRET` environment variable.

### External Cron (cron-job.org, EasyCron)

Set up an HTTP POST to:
```
POST https://your-domain.com/api/cron/ingest
Authorization: Bearer <CRON_SECRET>
```

Schedule: Every 2 hours (`0 */2 * * *`)

### System Cron (Self-Hosted)

```bash
crontab -e
# Add:
0 */2 * * * curl -X POST http://localhost:3000/api/cron/ingest -H "Authorization: Bearer your-secret"
```

---

## Troubleshooting

### "EPERM" error during Prisma generate
**Cause:** DLL locked by running dev server.
**Fix:** Kill all Node processes, then re-run:
```bash
taskkill //F //IM node.exe    # Windows
npx prisma generate
```

### "Could not find declaration for vader-sentiment"
**Cause:** Missing type declaration.
**Fix:** Ensure `src/types/vader-sentiment.d.ts` exists with the module declaration.

### Events not loading
**Cause:** No ingestion has been run yet.
**Fix:** Trigger ingestion via Settings page or `/api/cron/ingest`.

### $0 prices on stocks
**Cause:** Google Finance doesn't support the symbol or exchange mapping is wrong.
**Fix:** Check `EXCHANGE_MAP` in `src/lib/sources/yahoo.ts` and add the correct exchange.

### Authentication redirect loop
**Cause:** `NEXTAUTH_SECRET` not set or mismatched.
**Fix:** Ensure `.env` has `NEXTAUTH_SECRET` and restart the dev server.

---

## Test Credentials

For development and testing:

| Field | Value |
|---|---|
| Email | test@geopulse.dev |
| Password | testpass123 |

Create via `/auth/signup` if the account doesn't exist yet.
