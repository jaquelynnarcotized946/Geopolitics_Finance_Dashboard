# GeoPulse - Complete Application Guide

## Table of Contents
1. [What is GeoPulse?](#what-is-geopulse)
2. [How It Works - User Perspective](#how-it-works---user-perspective)
3. [Technical Architecture](#technical-architecture)
4. [Data Flow & Pipeline](#data-flow--pipeline)
5. [Key Systems Explained](#key-systems-explained)
6. [External Integrations](#external-integrations)
7. [How Money Works (Billing)](#how-money-works-billing)
8. [Database Models](#database-models)
9. [API Routes](#api-routes)
10. [Deployment & Infrastructure](#deployment--infrastructure)

---

## What is GeoPulse?

**Non-Technical Explanation:**
GeoPulse is like a personal intelligence analyst for your investments. It continuously watches for breaking news about geopolitical events (wars, elections, trade conflicts, natural disasters) around the world. When an event happens, GeoPulse:
1. Fetches the news from multiple sources
2. Analyzes why it matters financially
3. Connects it to stocks, currencies, and commodities that would be affected
4. Explains which assets are impacted and how
5. Delivers a daily "morning brief" summarizing what you need to know

Instead of spending hours reading news, you get a curated, financial-focused digest every morning.

**Technical Explanation:**
GeoPulse is a Next.js full-stack application that ingests geopolitical intelligence from multiple sources, enriches it with financial impact analysis, correlates events to financial assets, and serves the data through a web dashboard, API, and email digests.

---

## How It Works - User Perspective

### 1. User Signs Up
- Visit the app at https://geopolitics-finance-dashboard.vercel.app
- Create account with email and password (stored securely in Supabase)
- Account automatically created in database

### 2. User Explores
- **Dashboard**: See all geopolitical events on a filterable list
- **Global Map**: Visualize events on a world map with impact zones
- **Event Details**: Click an event to see:
  - Why it matters financially
  - Which assets are affected
  - Supporting news sources
  - Trust/confidence score

### 3. User Subscribes
- Free tier: Limited to browsing recent events
- Premium tier ($8/month or $79/year via Stripe): Unlocks:
  - Saved filters (save custom dashboard views)
  - Morning digest delivery (daily email at chosen time)
  - Historical access to all events
  - Advanced filtering and search

### 4. User Receives Morning Brief
- Each day at user's chosen time (e.g., 7 AM EST)
- Email arrives with:
  - Top 5 events affecting their interests
  - Key assets impacted
  - Confidence/trust scores
  - Links to full details in dashboard

---

## Technical Architecture

### Stack

**Frontend (What Users See)**
- **Framework**: Next.js 16 (React 18 + TypeScript)
- **UI Library**: Tailwind CSS (styling)
- **Data Fetching**: SWR (smart caching)
- **Maps**: TradingView embeds (financial charts)

**Backend (Server Logic)**
- **Runtime**: Node.js on Vercel
- **Database ORM**: Prisma (talks to PostgreSQL)
- **Authentication**: Supabase Auth (login system)
- **Scheduled Jobs**: Vercel Cron (runs tasks on schedule)

**Database**
- **PostgreSQL**: Supabase-hosted (stores all data)
- **Two connection modes**:
  - Pooled (port 6543): For web requests (faster, multiplexed)
  - Direct (port 5432): For migrations and batch jobs

**External Services**
- **Stripe**: Payment processing & subscriptions
- **Supabase**: Database + authentication
- **RSS Feeds**: News sources
- **GDELT**: Geopolitical event data API

---

## Data Flow & Pipeline

### Where Data Comes From

```
RSS Feeds              GDELT API
    ↓                      ↓
    └──────────┬───────────┘
               ↓
         Fetch Stage (Download raw data)
               ↓
        Normalize Stage (Clean & standardize)
               ↓
        Save to Database (PostgreSQL via Prisma)
               ↓
        Enrich Stage (Add categories, tags, why-it-matters)
               ↓
      Correlate Stage (Match to financial assets)
               ↓
      Pattern Stage (Historical analysis)
               ↓
      Sentiment Stage (Analyze tone: positive/negative)
               ↓
      Dashboard/API/Email ready for users
```

### Ingestion Pipeline Stages (In Detail)

**1. Fetch** (~5 minutes)
- Fetches from configured RSS feeds in parallel
- Fetches from GDELT API with geopolitical keywords
- Records source health (successful? failed? slow?)
- Handles errors gracefully - if one source fails, others continue

**2. Normalize** (~2 minutes)
- Converts raw data to standard format:
  - `title`: Event headline
  - `description`: Full story text
  - `sourceUrl`: Link to original source
  - `publishedAt`: Event timestamp
  - `severity`: Score 0-10 (how serious)
  - `region`: Geographic location

**3. Persist** (~1 minute)
- Saves events to PostgreSQL
- Uses URL hash to avoid duplicates
- Tracks which sources reported each event

**4. Enrich** (~3 minutes)
- **Category**: Classifies event type (war, trade, sanctions, etc.)
- **Tags**: Searchable keywords (#Ukraine, #Tech, #FX)
- **Why It Matters**: LLM-generated explanation of financial impact
- **Relevance Score**: 0-100 (how important for finance)
- **Premium Insight Flag**: If multiple sources confirm or high severity

**5. Correlate** (~5 minutes)
- Matches event text against known asset names (stocks, currencies, commodities)
- Creates `Correlation` records with:
  - `symbol`: Stock ticker (e.g., "AAPL", "EUR/USD")
  - `impactScore`: 0-100 (strength of relationship)
  - `impactDirection`: "positive" or "negative"
  - `impactMagnitude`: 0-100 (how much will price move?)
- Example: "War in Middle East" → correlates to Oil (positive), Tech stocks (negative)

**6. Patterns** (~2 minutes)
- Groups historical event-to-asset relationships
- Asks: "How often do trade war events affect tech stocks?"
- Updates `Pattern` records for prediction features

**7. Sentiment** (~1 minute)
- Analyzes tone of event text using VADER algorithm
- Result: negative, neutral, or positive
- Used for UI indicators and trading signals

**8. Digest Prep** (~1 minute)
- Pre-processes events for morning brief emails
- Deduplicates within 24 hours (don't send same event twice)
- Groups by region and impact

**Total Pipeline Runtime**: ~20 minutes per full cycle
**Frequency**: Every 2 hours (12x per day)
**Tracking**: Every pipeline run creates:
- `IngestionLog`: High-level success/failure
- `IngestionJob`: Stage-by-stage progress
- `SourceHealth`: Source-specific metrics

---

## Key Systems Explained

### 1. Authentication System

**How Users Log In:**
1. User enters email + password on `/auth/signin`
2. Request goes to Supabase Auth API
3. Supabase validates password hash
4. Returns JWT token
5. Token stored as HTTP cookie (secure, httpOnly)
6. Browser sends cookie with every request
7. Server validates cookie on protected routes

**Key Files:**
- `src/pages/auth/signin.tsx`: Login UI
- `src/lib/auth.ts`: Create user, password validation
- `src/lib/serverAuth.ts`: Server-side auth checks
- `prisma/schema.prisma`: User model

**Two User Types:**
- **Supabase Auth User**: Created by Supabase (password stored securely)
- **Prisma User Record**: Our local profile (name, email, preferences)
- They link via `supabaseAuthId` field

**Legacy Migration:**
- Old app had local password hashing
- New `/api/auth/migrate-legacy` endpoint
- When old user logs in, we migrate them to Supabase
- After migration, they use Supabase Auth

---

### 2. Subscription & Billing System

**Free vs Premium:**
- **Free**: Browse public data, limited filters
- **Premium Monthly**: $8/month (USD)
- **Premium Yearly**: $79/year (USD) - ~34% discount

**How Subscriptions Work:**

```
User clicks "Upgrade" on Settings page
              ↓
Browser calls /api/billing/checkout
              ↓
Server creates Stripe checkout session
(includes user ID, price, success/cancel URLs)
              ↓
Browser redirects to Stripe checkout
              ↓
User enters card details
              ↓
Stripe processes payment
              ↓
Stripe sends webhook: checkout.session.completed
              ↓
Our /api/webhooks/stripe endpoint receives it
              ↓
We extract user ID and Stripe customer ID
              ↓
We call linkStripeCustomerToUser()
              ↓
Database updated: subscription.customerId set
              ↓
We check subscription status with Stripe API
              ↓
Database updated: subscription.status = "active"
              ↓
User now has premium features unlocked
```

**Webhook Events Handled:**
- `checkout.session.completed`: New purchase
- `customer.subscription.created`: New subscription active
- `customer.subscription.updated`: Plan changed (price, quantity, etc.)
- `customer.subscription.deleted`: Cancelled

**Key Files:**
- `src/lib/stripe.ts`: Stripe client, subscription sync
- `src/pages/api/billing/checkout.ts`: Create checkout session
- `src/pages/api/billing/portal.ts`: Link to Stripe customer portal
- `src/pages/api/webhooks/stripe.ts`: Webhook handler
- `prisma/schema.prisma`: Subscription, Entitlement models

**Feature Gating:**
- Every API route checks subscription status
- Free users can only access public data
- Premium users unlock filters, digests, saved views
- Check done in: `GET /api/me/entitlements`

---

### 3. User Preferences & Settings

**What Users Can Customize:**
- Timezone (for digest delivery time)
- Digest hour (e.g., 7 AM in their timezone)
- Saved filters (custom dashboard views)
- Email delivery settings
- Watchlists (favorite assets to track)
- Alerts (notify when event mentions specific symbol)

**Database Models:**
- `UserPreference`: Timezone, digest hour
- `SavedFilter`: Saved dashboard views
- `DigestSubscription`: Email delivery settings
- `Watchlist`: User's favorite assets
- `Alert`: Notification rules

---

### 4. Morning Digest System

**How It Works:**
```
Every hour at XX:00 UTC:
         ↓
/api/cron/digests endpoint triggered
         ↓
Find all users with digest due in this hour
(adjusting for their timezone)
         ↓
For each user:
  - Fetch events from last 24 hours
  - Filter by their saved preferences
  - Rank by relevance score
  - Select top 5
  - Generate email HTML
  - Send via email service
  - Record delivery in database
         ↓
Log completed digest run
```

**Deduplication:**
- If user received same event yesterday, skip it today
- Prevents spam of repeatedly trending events
- Tracks in `EmailDelivery` model

---

### 5. Correlation Engine

**How Assets Get Connected to Events:**

```
New event ingested: "Ukraine imposes sanctions on Russian banks"
              ↓
Correlation engine runs
              ↓
Scans text for known asset names:
  - Stock symbols: GAZP (Gazprom)
  - Currencies: RUB/USD, EUR/USD
  - Commodities: Oil, Natural Gas
              ↓
For each match, calculates:
  - Relevance: Does text directly mention? (0-100)
  - Direction: Will price go up or down?
  - Magnitude: By how much? (0-100)
              ↓
Creates Correlation record:
  {
    eventId: "evt_123",
    symbol: "GAZP",
    impactScore: 95,
    impactDirection: "negative",
    impactMagnitude: 75,
    window: "1-7 days"
  }
              ↓
Dashboard shows: "This event affects GAZP stock"
API returns: Event with correlations included
```

**Key File**: `src/lib/correlation/matchEvents.ts`

---

### 6. Trust & Confidence Scoring

**How Events Get Confidence Scores:**

```
Event comes from 1 source (e.g., Reuters only)
              ↓
Trust score = DEVELOPING (lower confidence)
  (Might be premature reporting)
              ↓

Same event reported by 3+ sources
(Reuters, AP, BBC)
              ↓
Trust score = CONFIRMED (higher confidence)
  (Multiple independent outlets agree)
              ↓

High severity event (8-10/10) with 3+ sources
              ↓
isPremiumInsight = true
  (Featured in premium digest section)
```

**Database Fields:**
- `supportingSourcesCount`: How many sources reported this?
- `sourceReliability`: Is this a trusted outlet?
- `isPremiumInsight`: Should be featured?
- `relevanceScore`: 0-100 (financial importance)

---

## External Integrations

### 1. Stripe Payment Processing

**What It Does:**
- Handles credit card payments
- Manages subscriptions (monthly/yearly)
- Sends webhooks when payments succeed/fail
- Provides billing portal for customers to manage

**Key Environment Variables:**
```
STRIPE_SECRET_KEY        # Secret API key (server-side only)
STRIPE_WEBHOOK_SECRET    # Webhook signing secret
STRIPE_PRICE_ID_MONTHLY  # Product ID for $8 plan
STRIPE_PRICE_ID_YEARLY   # Product ID for $79 plan
```

**Our Integration Points:**
- `/api/billing/checkout`: Create checkout session
- `/api/billing/portal`: Link to manage subscription
- `/api/webhooks/stripe`: Receive payment updates

**Security:**
- Webhook signature validated (prevent spoofing)
- Secret keys never exposed in frontend
- Prices stored in environment variables
- PCI compliance: We never touch raw card data

### 2. Supabase (Database + Auth)

**What It Does:**
- PostgreSQL database hosting
- User authentication (passwords, sessions)
- Row-level security (users can only see their data)
- Real-time subscriptions (optional)

**Key Environment Variables:**
```
DATABASE_URL                      # Pooled connection for web
DIRECT_URL                        # Direct connection for migrations
NEXT_PUBLIC_SUPABASE_URL         # Project URL (public)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  # Anon key (public)
SUPABASE_SERVICE_ROLE_KEY        # Secret key (server-side only)
```

**Two Connection Types:**
- **Pooled (port 6543)**: For web requests, multiplexed
- **Direct (port 5432)**: For Prisma migrations, batch jobs

### 3. RSS Feeds & GDELT API

**RSS Feeds:**
- Configured news sources (BBC, Reuters, AP, etc.)
- Fetched every 2 hours
- Parsed for headline, description, publish time
- Deduplicated by URL hash

**GDELT (Global Event Data on Location and Tone):**
- Free geopolitical event database
- Provides structured data on events
- Query: "Events mentioning Ukraine from last 24h"
- Returns: Event details, location, sentiment

**Configuration:**
- List of feeds in `config/feeds.json`
- GDELT query in environment variable
- Fallback handling if either source fails

### 4. TwelveData (Optional - Market Quotes)

**What It Does:**
- Provides real-time stock and forex quotes
- Used in market snapshot when showing asset prices

**Why Optional:**
- If not configured, app uses cached market data
- Doesn't break functionality, just less fresh prices

---

## How Money Works (Billing)

### Revenue Model

```
User sees "Upgrade to Premium"
              ↓
Clicks button → /api/billing/checkout
              ↓
Redirects to Stripe checkout form
              ↓
User enters card: 4242 4242 4242 4242 (test card)
              ↓
Stripe processes:
  - Monthly plan: $8/month (30 days)
  - Yearly plan: $79/year (365 days)
              ↓
Payment succeeds
              ↓
Stripe creates subscription object
              ↓
Stripe sends webhook to /api/webhooks/stripe
              ↓
We receive: customer.subscription.created event
              ↓
We extract subscription ID and customer ID
              ↓
We call Stripe API to get full subscription details
              ↓
We sync to our database:
  {
    userId: "cus_xxx",
    customerId: "cus_stripe_xxx",
    status: "active",
    planName: "premium_monthly",
    currentPeriodStart: 2026-03-31,
    currentPeriodEnd: 2026-04-30,
    cancelAtPeriodEnd: false
  }
              ↓
Next time user visits, we check subscription status
              ↓
Query: SELECT * FROM subscription WHERE userId = ?
              ↓
If status = "active": user has premium access
              ↓
If status = "canceled": access ends at currentPeriodEnd
              ↓
If status = "past_due": payment failed, show warning
```

### Cancellation Flow

```
User clicks "Cancel Subscription"
              ↓
Redirected to Stripe billing portal
(link via /api/billing/portal)
              ↓
Stripe shows: "Your subscription ends in X days"
              ↓
User confirms cancellation
              ↓
Stripe marks: cancelAtPeriodEnd = true
              ↓
Stripe sends: customer.subscription.updated webhook
              ↓
We sync to database
              ↓
User can still use premium until period end date
              ↓
After period end, status changes to "canceled"
              ↓
We check status → access revoked
```

### Payment Failure Handling

```
Monthly billing date arrives
              ↓
Stripe tries to charge card
              ↓
Card declined (expired, insufficient funds, etc.)
              ↓
Stripe retries 3 more times over next 15 days
              ↓
If all fail: status = "past_due"
              ↓
Stripe sends: customer.subscription.updated webhook
              ↓
We flag in database
              ↓
User sees warning on settings page
              ↓
Link to Stripe portal to update card
              ↓
User updates card
              ↓
Stripe retries and succeeds
              ↓
Back to normal
```

---

## Database Models

### Core Models Explained

**User**
- `id`: Unique identifier
- `email`: Login email (unique)
- `name`: Display name
- `supabaseAuthId`: Link to Supabase Auth user
- `createdAt`, `updatedAt`: Timestamps

**Event**
- `id`: Event identifier
- `title`: Headline
- `description`: Full text
- `sourceUrl`: Original news link
- `publishedAt`: When event occurred
- `severity`: 0-10 (how serious)
- `category`: War, Trade, Natural Disaster, etc.
- `tags`: Searchable keywords
- `whyThisMatters`: AI-generated explanation
- `region`: Geographic location
- `supportingSourcesCount`: How many outlets reported it
- `isPremiumInsight`: Should be in premium digest?
- `relevanceScore`: 0-100 (financial importance)
- `duplicateClusterId`: Groups duplicate stories

**Correlation**
- Links events to financial assets
- `eventId`: Which event
- `symbol`: Stock ticker, currency pair, commodity
- `impactScore`: 0-100 (strength of relationship)
- `impactDirection`: "positive" or "negative"
- `impactMagnitude`: 0-100 (how much will price move)
- `window`: "1-7 days", "1-30 days", etc.

**Subscription**
- Stripe integration
- `userId`: Which user
- `customerId`: Stripe customer ID
- `status`: active, canceled, past_due
- `planName`: premium_monthly or premium_yearly
- `currentPeriodStart`, `currentPeriodEnd`: Billing dates
- `cancelAtPeriodEnd`: Scheduled cancellation?

**Entitlement**
- Feature access flags
- `userId`: Which user
- `feature`: "premium", "alerts", "api_access"
- `grantedAt`, `expiresAt`: Validity dates

**UserPreference**
- User customizations
- `timezone`: "America/New_York"
- `digestHour`: 7 (7 AM digest time)
- `interests`: Favorite regions, sectors

**SavedFilter**
- Persisted dashboard views
- `userId`: Owner
- `name`: "Tech Events"
- `queryParams`: JSON of filter settings
- Users can load saved filters quickly

**DigestSubscription**
- Email delivery settings
- `userId`: Subscriber
- `enabled`: Send email?
- `timeZone`: User's timezone
- `scheduledHour`: Delivery time

**EmailDelivery**
- Audit trail of sent digests
- `userId`: Recipient
- `sentAt`: Timestamp
- `eventIds`: Which events were included
- Prevents duplicate sends within 24h

---

## API Routes

### Authentication Routes

**POST /api/auth/signup**
- Create new user account
- Body: `{ name, email, password, timezone, digestHour }`
- Returns: `{ ok: true }`

**POST /api/auth/signin** (via Supabase SDK)
- Login existing user
- Uses Supabase Auth directly

**POST /api/auth/migrate-legacy**
- Migrate old password-hashed users to Supabase Auth
- Called automatically on login failure

### Event & Intelligence Routes

**GET /api/events**
- List all events with server-side filtering
- Query params: `q` (search), `regions`, `categories`, `symbols`, `severity`, `from`, `to`, `limit`, `cursor`
- Returns: Paginated event list with correlations

**GET /api/events/[id]**
- Single event detail
- Includes: Full text, sources, correlations, trust score

**GET /api/me/entitlements**
- User's subscription status and feature access
- Returns: `{ plan, features, limits }`

### Preferences & Filters Routes

**GET/POST/DELETE /api/saved-filters**
- List, create, delete user's saved dashboard views
- Store complex filter combinations for quick reload

**GET/POST /api/digests/send**
- Generate or resend a digest preview
- Useful for testing digest generation

### Billing Routes

**POST /api/billing/checkout**
- Create Stripe checkout session
- Body: `{ interval: "monthly" or "yearly" }`
- Returns: `{ sessionId }` → redirect to Stripe

**POST /api/billing/portal**
- Create Stripe billing portal session
- Returns: `{ url }` → redirect to manage subscription

**POST /api/webhooks/stripe**
- Receive Stripe webhook events
- Signature validated with secret
- Updates subscription status in database

### Cron Routes (Scheduled Tasks)

**POST /api/cron/ingest**
- Trigger full ingestion pipeline
- Requires: `Authorization: Bearer CRON_SECRET`
- Runs: Fetch, Normalize, Enrich, Correlate, Patterns, Sentiment

**POST /api/cron/digests**
- Process and send morning briefs due in current hour
- Requires: `Authorization: Bearer CRON_SECRET`
- Timezone-aware (adjusts for each user)

### Admin Routes

**POST /api/sync** (if ADMIN_EMAILS set)
- Manually trigger ingestion
- Requires: Email in ADMIN_EMAILS list
- Useful for debugging

---

## Deployment & Infrastructure

### Where Everything Runs

```
User's Browser (JavaScript)
         ↓
 Vercel CDN (Edge network)
         ↓
Vercel Serverless Functions
(Node.js runtime)
         ↓
Supabase PostgreSQL Database
(cloud-hosted)
         ↓
External APIs:
  - Stripe
  - RSS Feeds
  - GDELT
  - TwelveData
```

### Deployment Architecture

**Vercel**
- Hosts Next.js frontend and backend
- Auto-deploys on git push
- Manages environment variables
- Runs cron jobs (scheduled ingestion, digests)
- Provides CDN and edge functions

**Supabase**
- PostgreSQL database (high availability)
- Automatic backups
- Connection pooling (pgBouncer)
- Real-time subscriptions (optional)

**GitHub**
- Source code repository
- Triggers automatic Vercel deployment
- CI/CD integration

### Environment Variables Required

**Stripe**
```
STRIPE_SECRET_KEY=sk_live_...       # Secret, server-only
STRIPE_WEBHOOK_SECRET=whsec_...     # Secret, server-only
STRIPE_PRICE_ID_MONTHLY=price_...   # Public
STRIPE_PRICE_ID_YEARLY=price_...    # Public
```

**Supabase**
```
DATABASE_URL=postgresql://...       # Pooled connection
DIRECT_URL=postgresql://...         # Direct connection
NEXT_PUBLIC_SUPABASE_URL=https://...   # Public
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=... # Public
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # Secret, server-only
```

**Application**
```
APP_URL=https://yourdomain.com      # Your domain
CRON_SECRET=random-secret           # Protect cron endpoints
ADMIN_EMAILS=your@email.com         # Admin access
```

### Cron Jobs Configuration

In `vercel.json`:
```
{
  "crons": [
    {
      "path": "/api/cron/ingest",
      "schedule": "0 */2 * * *"    // Every 2 hours
    },
    {
      "path": "/api/cron/digests",
      "schedule": "0 * * * *"      // Every hour
    }
  ]
}
```

### Data Flow During Deployment

```
1. Developer pushes code to GitHub
2. GitHub notifies Vercel
3. Vercel builds Next.js app
4. Vercel runs tests (npm run test)
5. If tests pass:
   - Deploys to staging URL (preview)
   - User can test on preview deployment
6. If merged to main:
   - Vercel deploys to production
   - Environment variables from Vercel applied
   - App restarted with new code
7. Old deployment still available (can rollback)
```

### Backup & Disaster Recovery

**Database Backups**
- Supabase auto-backs up every day
- 30-day retention available
- Can restore to point-in-time if needed

**Code Recovery**
- GitHub stores complete history
- Can rollback to any previous version
- Vercel keeps old deployments (can restore)

**Data Loss Prevention**
- Events are immutable (never deleted)
- User data backed up with database
- Stripe data independently backed up by Stripe

---

## Security Architecture

### How Secrets Are Protected

**Never Exposed:**
- API keys stored in Vercel environment only
- Never committed to git (checked by security script)
- Never logged to console
- Never sent to frontend
- `.env` files in `.gitignore`

**Webhook Security:**
- Stripe-signed request validation
- Signature calculated with secret key
- Prevents spoofing/tampering
- Implemented in `/api/webhooks/stripe`

**Cron Security:**
- Bearer token authentication
- All cron routes require `Authorization: Bearer CRON_SECRET`
- Secret only in Vercel environment
- External requests can't trigger pipelines

### Authentication Security

**Password Storage:**
- Handled by Supabase Auth
- Never stored plaintext
- Bcrypt hashing (salted)
- We never see actual password

**Session Handling:**
- JWT token in HTTP-only cookie
- Browser can't access via JavaScript (XSS protection)
- Automatically sent with requests
- Server validates on each request

**TypeScript Type Safety:**
- Compiler catches many errors at build time
- Database schema enforcement
- API response validation

---

## How To Understand The Code

### Key Files To Read First

1. **`src/pages/api/webhooks/stripe.ts`** (30 lines)
   - Shows how Stripe webhooks are validated and processed
   - Demonstrates signature verification
   - Shows database sync logic

2. **`src/lib/stripe.ts`** (100 lines)
   - Stripe client initialization
   - Subscription sync function
   - Entitlement checking

3. **`src/lib/ingest/events.ts`** (300 lines)
   - Complete pipeline orchestration
   - All 8 stages of ingestion
   - Error handling and logging

4. **`prisma/schema.prisma`** (250 lines)
   - All database models
   - Read this to understand data structure
   - Source of truth for database

5. **`src/pages/api/events.ts`** (50 lines)
   - Server-side event filtering
   - Shows how API routes work
   - Demonstrates SWR data fetching pattern

### Reading Tips

- **Top-down**: Read architecture.md → data-pipeline.md → then code
- **Follow a feature**: Trace "subscribe to premium" from UI → API → database → webhook
- **Search for patterns**: Look for how errors are handled in different places
- **Check types**: TypeScript files show data structure clearly

---

## Summary: How It All Fits Together

```
User Signs Up
    ↓
Email + password sent to Supabase Auth
    ↓
User record created in database
    ↓
User logs in
    ↓
Session cookie set
    ↓
User browses dashboard
    ↓
Frontend fetches /api/events
    ↓
Server validates session
    ↓
Server queries database for events
    ↓
SWR caches results on client
    ↓
User clicks "Upgrade"
    ↓
Redirected to Stripe checkout
    ↓
User enters card, Stripe processes
    ↓
Stripe sends webhook to our endpoint
    ↓
We validate signature
    ↓
We sync subscription to database
    ↓
User now has premium access
    ↓
Tomorrow morning:
    ↓
Cron job triggers /api/cron/digests
    ↓
For each user with active subscription:
    ↓
  Fetch last 24h events
  Filter by user preferences
  Generate email
  Send via email service
    ↓
User receives morning brief
    ↓
Clicks link → sees full event on dashboard
    ↓
Sees correlations: "This affects AAPL stock"
```

---

## Next Steps

- **To Deploy**: Read `docs/DEPLOYMENT.md`
- **For Stripe Setup**: Read `docs/billing-guide.md`
- **For Troubleshooting**: Check `SECURITY.md` and `docs/api-reference.md`
- **To Understand Code**: Start with `prisma/schema.prisma`, then trace a feature

**Everything is in place. You now have a complete mental model of GeoPulse.**


