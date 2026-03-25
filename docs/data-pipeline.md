# GeoPulse Intelligence — Data Ingestion & Processing Pipeline

## Overview

GeoPulse ingests geopolitical news from 50+ RSS feeds across 20 countries and the GDELT global event database. Events are deduplicated, stored, correlated to financial instruments, analyzed for sentiment, and aggregated into patterns — all automatically.

**Entry point:** `src/lib/ingest/events.ts` → `ingestAllEvents()`

---

## Pipeline Stages

```
┌─────────────────┐     ┌─────────────────┐
│  50+ RSS Feeds  │     │   GDELT API     │
│  (config/       │     │   (global event  │
│   feeds.json)   │     │    database)     │
└────────┬────────┘     └────────┬─────────┘
         │                       │
         ▼                       ▼
┌────────────────────────────────────────────┐
│  Stage 1: PARALLEL FETCH                   │
│  · rss.ts: Parse all feeds concurrently    │
│  · gdelt.ts: Query GDELT GKG API          │
│  · Extract: title, summary, source,        │
│    region, countryCode, URL, publishedAt   │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│  Stage 2: DEDUPLICATE & UPSERT             │
│  · Deduplicate by URL (unique constraint)  │
│  · Prisma upsert: create or skip existing  │
│  · Assign severity score (1-10)            │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│  Stage 3: CORRELATE                        │
│  · matchEvents.ts: Match keywords to       │
│    174 symbol mappings                     │
│  · Fetch live quotes from Google Finance   │
│  · Create Correlation records with impact  │
│    score, direction, magnitude             │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│  Stage 4: AGGREGATE PATTERNS               │
│  · patterns.ts: Group correlations by      │
│    (eventCategory, symbol)                 │
│  · Calculate: avgImpactPct, direction,     │
│    confidence, occurrences                 │
└────────────────────┬───────────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────┐
│  Stage 5: SENTIMENT ANALYSIS               │
│  · sentiment.ts: VADER analysis on         │
│    title + summary text                    │
│  · Batch process up to 200 unlabeled       │
│    events per run                          │
│  · Store sentimentScore + sentimentLabel   │
└────────────────────────────────────────────┘
```

---

## Stage 1: Source Fetching

### RSS Feeds (`src/lib/sources/rss.ts`)

Parses RSS/Atom feeds using `rss-parser`. Configuration lives in `config/feeds.json`:

```json
[
  {
    "name": "BBC World",
    "url": "https://feeds.bbci.co.uk/news/world/rss.xml",
    "region": "Global",
    "countryCode": "GB"
  },
  {
    "name": "Al Jazeera",
    "url": "https://www.aljazeera.com/xml/rss/all.xml",
    "region": "Middle East",
    "countryCode": "QA"
  }
  // ... 48+ more feeds
]
```

**Countries covered:** US, UK, Germany, France, India, China, Japan, South Korea, Australia, Russia, Brazil, Mexico, Saudi Arabia, UAE, Israel, Turkey, South Africa, Nigeria, Canada, Qatar, and more.

**Feed sources include:** BBC, Al Jazeera, CNBC, NPR, Defense News, Federal Reserve, Reuters, and regional outlets.

Each feed item produces:
- `title` — headline text
- `summary` — description/content snippet
- `url` — unique identifier (used for deduplication)
- `publishedAt` — publication timestamp
- `source` — feed name
- `region` — geographic region from config
- `countryCode` — ISO country code from config

### GDELT (`src/lib/sources/gdelt.ts`)

Queries the GDELT Global Knowledge Graph (GKG) API for geopolitical events. GDELT provides structured event data with:
- Actor information (countries, organizations)
- Event type codes (CAMEO taxonomy)
- Tone/sentiment scores
- Geographic coordinates

---

## Stage 2: Deduplication & Storage

Events are deduplicated by their URL (unique constraint in the Event model):

```typescript
await prisma.event.upsert({
  where: { url: event.url },
  update: {},  // skip if exists
  create: {
    title: event.title,
    summary: event.summary,
    source: event.source,
    region: event.region,
    countryCode: event.countryCode,
    url: event.url,
    publishedAt: event.publishedAt,
    severity: computeSeverity(event),
  },
});
```

### Severity Scoring (`src/lib/scoring/severity.ts`)

Multi-signal severity score (1-10) based on:
- **Keyword proximity** — high-impact keywords (war, missile, nuclear) score higher
- **Source weight** — tier-1 sources (BBC, Reuters) weighted higher
- **Entity signals** — mentions of heads of state, military, central banks increase severity

---

## Stage 3: Correlation Generation

See `docs/correlation-engine.md` for full details. Key points:
- 174 keyword-to-symbol mappings across 17 categories
- Word-boundary regex matching (not substring)
- False positive guards
- Live quote fetching for impact magnitude
- Creates `Correlation` records linking events to symbols

---

## Stage 4: Pattern Aggregation

See `docs/pattern-learning.md` for full details. Groups correlations by (category, symbol) and calculates statistical patterns over time.

---

## Stage 5: Sentiment Analysis

See `docs/sentiment-analysis.md` for full details. VADER compound scoring with positive/negative/neutral classification.

---

## Triggering Ingestion

### Automatic (Cron)
The `/api/cron/ingest` endpoint is called on a schedule. Protected by a secret token.

```
POST /api/cron/ingest
Header: Authorization: Bearer <CRON_SECRET>
```

### Manual (Dashboard)
The settings page and `/api/sync` endpoint allow manual trigger:

```
POST /api/sync
(Requires authenticated session)
```

### On-Demand
The ingestion pipeline can be called programmatically:

```typescript
import { ingestAllEvents } from "@/lib/ingest/events";
const result = await ingestAllEvents();
// { count: 47, errors: [] }
```

---

## Ingestion Logging

Every ingestion run is logged in the `IngestionLog` table:

| Field | Type | Description |
|---|---|---|
| source | String | "rss", "gdelt", or "all" |
| eventsFound | Int | Number of new events ingested |
| status | String | "running", "success", "partial", "failed" |
| error | String? | Error message if failed |
| startedAt | DateTime | When ingestion started |
| finishedAt | DateTime? | When ingestion completed |

The sidebar displays the latest ingestion status:
- **LIVE** (green) — last ingestion succeeded
- **ERR** (red) — last ingestion failed
- **IDLE** (amber) — no recent ingestion

---

## Feed Configuration

To add a new RSS feed, edit `config/feeds.json`:

```json
{
  "name": "New Source Name",
  "url": "https://example.com/rss.xml",
  "region": "Europe",
  "countryCode": "DE"
}
```

The feed will be picked up on the next ingestion cycle automatically. No code changes needed.

---

## Error Handling

- **Feed failures** are isolated — one broken feed doesn't block others (uses `Promise.allSettled`)
- **GDELT failures** fall back gracefully — RSS feeds still process
- **Database errors** are caught and logged to `IngestionLog` with status "partial" or "failed"
- **Quote fetch failures** return zero-price placeholders (correlation still created, just without live price data)

---

## Performance Characteristics

| Metric | Value |
|---|---|
| Feeds processed | 50+ per cycle |
| Events per cycle | ~20-100 new (depending on news volume) |
| Correlation generation | ~100-500ms per batch |
| Sentiment analysis | ~50-200ms per event (VADER is fast) |
| Total pipeline time | ~30-90 seconds per full cycle |
| Ingestion interval | Every 2 hours (configurable) |
| Current database size | ~1,300+ events, 4,000+ correlations, 180+ patterns |
