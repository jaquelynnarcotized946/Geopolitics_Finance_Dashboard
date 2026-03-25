# GeoPulse Intelligence — Database Schema

## Overview

GeoPulse uses **Prisma ORM** with **SQLite** as the database engine. The schema defines 9 models covering users, events, correlations, patterns, watchlists, alerts, and system logging.

**Schema file:** `prisma/schema.prisma`
**Database file:** `prisma/dev.db`

---

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────────┐
│    User      │──1:1──│  UserPreference   │
│              │       │                  │
│  id          │       │  categories (JSON)│
│  name        │       │  regions (JSON)   │
│  email       │       │  symbols (JSON)   │
│  passwordHash│       │  onboarded        │
└──────┬───────┘       └──────────────────┘
       │
       │ 1:N
       ├──────────────────┐
       │                  │
┌──────┴───────┐   ┌─────┴──────┐
│  Watchlist   │   │   Alert    │
│              │   │            │
│  name        │   │  name      │
│              │   │  condition │
└──────┬───────┘   │  status    │
       │           └────────────┘
       │ 1:N
┌──────┴───────┐
│WatchlistItem │
│              │
│  symbol      │
│  name        │
│  assetClass  │
│  countryCode │
└──────────────┘


┌──────────────┐       ┌──────────────────┐
│    Event     │──1:N──│  Correlation      │
│              │       │                  │
│  title       │       │  symbol           │
│  summary     │       │  impactScore      │
│  source      │       │  impactDirection  │
│  region      │       │  impactMagnitude  │
│  countryCode │       │  window           │
│  severity    │       │  timestamp        │
│  sentimentS. │       └──────────────────┘
│  sentimentL. │
│  url (unique)│
│  publishedAt │
└──────────────┘


┌──────────────────┐   ┌──────────────────┐
│    Pattern       │   │ MarketSnapshot   │
│                  │   │                  │
│  eventCategory   │   │  symbol          │
│  symbol          │   │  price           │
│  avgImpactPct    │   │  changePct       │
│  direction       │   │  assetClass      │
│  confidence      │   │  timestamp       │
│  occurrences     │   └──────────────────┘
└──────────────────┘

┌──────────────────┐
│  IngestionLog    │
│                  │
│  source          │
│  eventsFound     │
│  status          │
│  error           │
│  startedAt       │
│  finishedAt      │
└──────────────────┘
```

---

## Model Details

### User

Stores authenticated user accounts.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| name | String | | Display name |
| email | String | @unique | Login email |
| passwordHash | String | | bcrypt hash |
| createdAt | DateTime | @default(now()) | Account creation |
| updatedAt | DateTime | @updatedAt | Last modification |

**Relations:**
- `watchlists` → Watchlist[] (1:N)
- `alerts` → Alert[] (1:N)
- `preference` → UserPreference? (1:1)

---

### UserPreference

Stores user's interest selections (topics, regions, stocks). Created during onboarding.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| userId | String | @unique | Foreign key to User |
| categories | String | @default("[]") | JSON-encoded array of category strings |
| regions | String | @default("[]") | JSON-encoded array of region strings |
| symbols | String | @default("[]") | JSON-encoded array of stock symbols |
| onboarded | Boolean | @default(false) | Whether user completed onboarding |
| createdAt | DateTime | @default(now()) | Creation timestamp |
| updatedAt | DateTime | @updatedAt | Last modification |

**JSON-in-String Pattern:** SQLite doesn't support array columns. Categories, regions, and symbols are stored as JSON strings:
```
categories = '["energy","conflict","technology"]'
regions    = '["Middle East","Asia-Pacific"]'
symbols    = '["SPY","NVDA","GLD"]'
```

Client-side, parse with `JSON.parse()`:
```typescript
const cats = JSON.parse(preference.categories) as string[];
```

---

### Event

Core model storing every ingested geopolitical event.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| title | String | | Headline text |
| summary | String? | | Description / content snippet |
| source | String | | Feed name (e.g., "BBC World") |
| region | String | | Geographic region |
| countryCode | String? | | ISO country code (e.g., "US", "SA") |
| severity | Int | @default(5) | Impact severity 1-10 |
| sentimentScore | Float? | | VADER compound score (-1.0 to +1.0) |
| sentimentLabel | String? | | "positive", "negative", or "neutral" |
| url | String | @unique | Source URL (used for deduplication) |
| publishedAt | DateTime | | Original publication time |
| createdAt | DateTime | @default(now()) | When ingested |

**Relations:**
- `correlations` → Correlation[] (1:N)

**Indexes:**
- `url` — Unique index for deduplication
- `publishedAt` — For chronological queries
- `severity` — For filtering high-severity events

---

### Correlation

Links an event to a financial symbol with impact data.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| eventId | String | | Foreign key to Event |
| symbol | String | | Stock/ETF symbol (e.g., "USO") |
| impactScore | Float | | Match strength (0-1) |
| impactDirection | String | | "up", "down", or "neutral" |
| impactMagnitude | Float? | | Actual % price change |
| window | String | @default("24h") | Time window for measurement |
| timestamp | DateTime | @default(now()) | When correlation was created |

**Relations:**
- `event` → Event (N:1)

---

### Pattern

Aggregated historical pattern showing how an event category typically affects a symbol.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| eventCategory | String | | Event category (e.g., "Energy") |
| symbol | String | | Financial symbol (e.g., "USO") |
| avgImpactPct | Float | | Average historical impact % |
| direction | String | | Majority direction ("up" or "down") |
| confidence | Float | | Confidence score (0.0 to 1.0) |
| occurrences | Int | | Number of supporting correlations |
| createdAt | DateTime | @default(now()) | First created |
| updatedAt | DateTime | @updatedAt | Last recalculated |

**Unique constraint:** `@@unique([eventCategory, symbol])` — one pattern per category-symbol pair.

---

### MarketSnapshot

Point-in-time market data for a symbol.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| symbol | String | | Stock/ETF symbol |
| price | Float | | Price at snapshot time |
| changePct | Float | | % change from previous close |
| assetClass | String? | | "ETF", "Stock", "Bond", etc. |
| timestamp | DateTime | @default(now()) | Snapshot time |

---

### Watchlist

User-created watchlist for tracking specific assets.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| userId | String | | Foreign key to User |
| name | String | | Watchlist name |
| createdAt | DateTime | @default(now()) | Creation time |

**Relations:**
- `user` → User (N:1)
- `items` → WatchlistItem[] (1:N)

---

### WatchlistItem

Individual item in a watchlist.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| watchlistId | String | | Foreign key to Watchlist |
| symbol | String | | Stock/ETF symbol |
| name | String? | | Display name |
| assetClass | String? | | "ETF", "Stock", etc. |
| countryCode | String? | | ISO country code |
| addedAt | DateTime | @default(now()) | When added |

---

### Alert

User-defined alert rules.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| userId | String | | Foreign key to User |
| name | String | | Alert name |
| condition | String | | Rule condition string |
| status | String | @default("armed") | "armed" or "disabled" |
| createdAt | DateTime | @default(now()) | Creation time |

---

### IngestionLog

Tracks every data ingestion cycle for monitoring.

| Field | Type | Constraints | Description |
|---|---|---|---|
| id | String | @id @default(cuid()) | Primary key |
| source | String | | "rss", "gdelt", or "all" |
| eventsFound | Int | @default(0) | New events ingested |
| status | String | @default("running") | "running", "success", "partial", "failed" |
| error | String? | | Error message if failed |
| startedAt | DateTime | @default(now()) | Cycle start |
| finishedAt | DateTime? | | Cycle completion |

---

## Database Commands

```bash
# Generate Prisma client (after schema changes)
npx prisma generate

# Create/apply migrations
npx prisma migrate dev --name <migration_name>

# Reset database (destructive — deletes all data)
npx prisma migrate reset

# Open database GUI
npx prisma studio

# Push schema changes without migration (dev only)
npx prisma db push
```

---

## Migration to PostgreSQL

When ready to scale beyond SQLite:

1. Change datasource in `schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Convert `UserPreference` arrays from JSON strings to proper arrays:
   ```prisma
   categories String[]  // native PostgreSQL arrays
   regions    String[]
   symbols    String[]
   ```

3. Run `npx prisma migrate dev` to generate PostgreSQL migration

4. Update client code to remove `JSON.parse()` calls for preference arrays
