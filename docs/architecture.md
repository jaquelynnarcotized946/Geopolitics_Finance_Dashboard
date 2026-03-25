# GeoPulse Intelligence — System Architecture

## Overview

GeoPulse is a geopolitical-finance intelligence platform that connects world events to market movements. It ingests news from 50+ RSS feeds and GDELT, correlates events to 60+ financial instruments using 174 keyword mappings, runs sentiment analysis locally via VADER, learns patterns over time, and serves everything through a real-time dark-themed dashboard.

**Tech Stack:** Next.js 16.1.6 (Pages Router) · React 18 · TypeScript · Prisma ORM · SQLite · NextAuth v4 (JWT) · SWR · Tailwind CSS · TradingView Widgets

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Client)                         │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐ ┌─────────┐ │
│  │Dashboard │ │ Global   │ │Timeline │ │ Event  │ │ Stock   │ │
│  │  Page    │ │   Map    │ │  Page   │ │ Detail │ │ Detail  │ │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └───┬────┘ └────┬────┘ │
│       │             │            │           │           │       │
│  ┌────┴─────────────┴────────────┴───────────┴───────────┴────┐ │
│  │              SWR Data Fetching Layer                        │ │
│  │  useEvents · useQuotes · usePatterns · usePreferences      │ │
│  └────────────────────────────┬────────────────────────────────┘ │
└───────────────────────────────┼──────────────────────────────────┘
                                │ HTTP (JSON)
┌───────────────────────────────┼──────────────────────────────────┐
│                     NEXT.JS SERVER                               │
│                                                                  │
│  ┌────────────────────────────┴────────────────────────────────┐ │
│  │                    API Routes Layer                          │ │
│  │  /api/events · /api/markets/quotes · /api/patterns          │ │
│  │  /api/patterns/predict · /api/preferences · /api/status     │ │
│  │  /api/stocks/[symbol] · /api/cron/ingest · /api/sync        │ │
│  │  /api/watchlists · /api/alerts · /api/auth/[...nextauth]    │ │
│  └──────────┬───────────────────────────────┬──────────────────┘ │
│             │                               │                    │
│  ┌──────────┴──────────┐     ┌──────────────┴────────────────┐  │
│  │   Service Layer     │     │     Ingestion Pipeline        │  │
│  │                     │     │                               │  │
│  │  · Prisma Client    │     │  RSS Parser ─┐               │  │
│  │  · Google Finance   │     │  GDELT API ──┼→ Deduplicate  │  │
│  │    Quote Scraper    │     │              │    & Upsert    │  │
│  │  · Auth (bcrypt)    │     │              ▼               │  │
│  │  · Format Utils     │     │  Correlate → Patterns →      │  │
│  │                     │     │  Sentiment → Store            │  │
│  └──────────┬──────────┘     └──────────────┬────────────────┘  │
│             │                               │                    │
│  ┌──────────┴───────────────────────────────┴──────────────────┐ │
│  │                   Prisma ORM                                │ │
│  └──────────────────────────┬──────────────────────────────────┘ │
└─────────────────────────────┼────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   SQLite Database  │
                    │   (dev.db)         │
                    │                    │
                    │  9 Models:         │
                    │  User              │
                    │  UserPreference    │
                    │  Event             │
                    │  Correlation       │
                    │  Pattern           │
                    │  MarketSnapshot    │
                    │  Watchlist         │
                    │  WatchlistItem     │
                    │  IngestionLog      │
                    │  Alert             │
                    └────────────────────┘
```

---

## Data Flow

```
                    ┌──────────────┐     ┌──────────────┐
                    │  50+ RSS     │     │  GDELT API   │
                    │  Feeds       │     │  (geopolitical│
                    │  (20 countries)    │   events)    │
                    └──────┬───────┘     └──────┬───────┘
                           │                     │
                           ▼                     ▼
                    ┌────────────────────────────────────┐
                    │    1. INGEST & DEDUPLICATE          │
                    │    src/lib/ingest/events.ts         │
                    │    · Parallel fetch from all sources│
                    │    · Deduplicate by URL             │
                    │    · Upsert to Event table          │
                    └──────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────────────┐
                    │    2. CORRELATE                     │
                    │    src/lib/correlation/matchEvents  │
                    │    · 174 keyword→symbol mappings    │
                    │    · Word-boundary regex matching   │
                    │    · False positive guards          │
                    │    · Impact scoring (direction +    │
                    │      magnitude from live quotes)    │
                    └──────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────────────┐
                    │    3. LEARN PATTERNS                │
                    │    src/lib/correlation/patterns.ts  │
                    │    · Aggregate by (category,symbol) │
                    │    · Calculate avg impact, direction│
                    │    · Confidence scoring             │
                    └──────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────────────┐
                    │    4. SENTIMENT ANALYSIS            │
                    │    src/lib/analysis/sentiment.ts    │
                    │    · VADER (local, free, no API)    │
                    │    · Score: -1.0 to +1.0            │
                    │    · Label: positive/negative/neutral│
                    └──────────────┬─────────────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────────────┐
                    │    5. SERVE                         │
                    │    API Routes → SWR Hooks → Pages   │
                    │    · Auto-refresh (2min events,     │
                    │      5min patterns)                 │
                    │    · TradingView live charts        │
                    │    · Google Finance live quotes     │
                    └────────────────────────────────────┘
```

---

## Key Design Decisions

### Why Pages Router (not App Router)?
Next.js 16 supports both, but Pages Router was chosen for stability, simpler mental model, and compatibility with NextAuth v4's `getServerSideProps` pattern.

### Why SQLite (not Postgres)?
Zero-cost development and deployment. Single-file database, no server to manage. Easy to migrate to Postgres/Supabase later when scaling. SQLite handles the current data volume (1000s of events) without issues.

### Why SWR (not React Query)?
Lighter weight, built by Vercel (same team as Next.js), perfect for the polling/refresh pattern used throughout (events refresh every 2 min, quotes on demand).

### Why VADER (not FinBERT/GPT)?
$0 cost, runs locally in Node.js, no API key needed, fast execution. Good enough for headline sentiment classification. Can upgrade to FinBERT or a cloud LLM later for deeper analysis.

### Why Google Finance Scraping (not Yahoo Finance API)?
yahoo-finance2 npm package broke with API changes. Google Finance HTML scraping is free, reliable, and returns real-time prices. No API key required.

### Why TradingView Widgets?
Industry-standard financial charts, free for embedding, professional appearance, real-time data built-in. No additional data costs.

---

## Directory Structure

```
GPF_Dashboard/
├── prisma/
│   └── schema.prisma          # Database schema (9 models)
├── config/
│   └── feeds.json             # RSS feed configuration (50+ feeds)
├── src/
│   ├── pages/
│   │   ├── _app.tsx           # App wrapper (SessionProvider, global styles)
│   │   ├── index.tsx          # Landing/redirect page
│   │   ├── dashboard.tsx      # Main dashboard with category filters
│   │   ├── digest.tsx         # Daily intelligence digest
│   │   ├── timeline.tsx       # Chronological event timeline
│   │   ├── map.tsx            # Interactive world map (per-country)
│   │   ├── assets.tsx         # Watchlist / tracked assets
│   │   ├── alerts.tsx         # User alert management
│   │   ├── settings.tsx       # User settings & interest management
│   │   ├── onboarding.tsx     # Perplexity-style interest picker
│   │   ├── auth.tsx           # Auth redirect
│   │   ├── auth/
│   │   │   ├── signin.tsx     # Login page
│   │   │   └── signup.tsx     # Registration page
│   │   ├── event/
│   │   │   └── [id].tsx       # Event detail with TradingView charts
│   │   ├── stock/
│   │   │   └── [symbol].tsx   # Stock detail with related events
│   │   └── api/               # 15 API routes (see api-reference.md)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx     # Main authenticated layout wrapper
│   │   │   ├── PublicLayout.tsx # Unauthenticated layout
│   │   │   ├── Header.tsx     # Top header bar
│   │   │   └── Sidebar.tsx    # Navigation sidebar with system status
│   │   ├── dashboard/
│   │   │   ├── EventMarketPanel.tsx  # Event list with stock correlations
│   │   │   ├── PatternInsightsCard.tsx # Pattern display card
│   │   │   └── TopMoversCard.tsx     # Top market movers widget
│   │   └── ui/
│   │       ├── SectionCard.tsx       # Reusable card container
│   │       ├── SeverityBadge.tsx     # 1-10 severity indicator
│   │       ├── MetricCard.tsx        # KPI metric display
│   │       ├── NavLink.tsx           # Sidebar navigation link
│   │       ├── StockTicker.tsx       # Stock price ticker
│   │       ├── Sparkline.tsx         # Mini sparkline chart
│   │       ├── InputField.tsx        # Form input component
│   │       ├── WorldMapSvg.tsx       # SVG world map component
│   │       └── TradingViewChart.tsx  # TradingView widget wrappers
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma client singleton
│   │   ├── auth.ts                   # NextAuth configuration
│   │   ├── format.ts                 # formatPct, formatCurrency, relativeTime
│   │   ├── requireAuth.ts           # getServerSideProps auth guard
│   │   ├── watchlists.ts            # Watchlist helpers
│   │   ├── hooks/                    # SWR data hooks
│   │   │   ├── useEvents.ts         # Events with correlations
│   │   │   ├── useQuotes.ts         # Live stock quotes
│   │   │   ├── usePatterns.ts       # Learned patterns
│   │   │   ├── usePreferences.ts    # User preferences
│   │   │   ├── useStatus.ts         # System status
│   │   │   ├── useAlerts.ts         # User alerts
│   │   │   └── useWatchlists.ts     # Watchlist data
│   │   ├── sources/
│   │   │   ├── rss.ts               # RSS feed parser
│   │   │   ├── gdelt.ts             # GDELT API client
│   │   │   └── yahoo.ts             # Google Finance quote scraper
│   │   ├── correlation/
│   │   │   ├── matchEvents.ts       # 174-mapping correlation engine
│   │   │   ├── patterns.ts          # Pattern aggregation
│   │   │   └── predict.ts           # Prediction engine
│   │   ├── ingest/
│   │   │   ├── events.ts            # Main ingestion pipeline
│   │   │   └── scheduler.ts         # Cron scheduling
│   │   ├── scoring/
│   │   │   └── severity.ts          # Multi-signal severity scoring
│   │   └── analysis/
│   │       └── sentiment.ts         # VADER sentiment analysis
│   └── types/
│       └── vader-sentiment.d.ts     # Type declarations for VADER
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── postcss.config.mjs
```

---

## Authentication Flow

```
User → /auth/signin → NextAuth Credentials Provider → bcrypt verify
                                                          │
                                                     JWT Token
                                                          │
                                    ┌─────────────────────┴──────────────┐
                                    │  Every protected page:             │
                                    │  getServerSideProps → requireAuth  │
                                    │  → getServerSession → redirect     │
                                    │    to /auth/signin if no session   │
                                    └────────────────────────────────────┘
```

- **Strategy:** JWT (stateless, no session table needed)
- **Password hashing:** bcrypt via bcryptjs
- **Test credentials:** test@geopulse.dev / testpass123

---

## External Integrations

| Integration | Purpose | Cost | File |
|---|---|---|---|
| RSS Feeds (50+) | News ingestion from 20 countries | Free | `src/lib/sources/rss.ts` |
| GDELT API | Geopolitical event data | Free | `src/lib/sources/gdelt.ts` |
| Google Finance | Live stock/ETF quotes (60+ symbols) | Free (scraping) | `src/lib/sources/yahoo.ts` |
| TradingView | Interactive financial charts | Free (widgets) | `src/components/ui/TradingViewChart.tsx` |
| VADER | Sentiment analysis | Free (local) | `src/lib/analysis/sentiment.ts` |
| react-simple-maps | Interactive world map | Free (OSS) | `src/pages/map.tsx` |

**Total external cost: $0/month**
