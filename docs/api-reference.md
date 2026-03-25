# GeoPulse Intelligence — API Reference

## Overview

GeoPulse exposes 15 API endpoints via Next.js API Routes. All endpoints return JSON. Authentication uses NextAuth JWT sessions where required.

**Base URL:** `http://localhost:3000/api`

---

## Authentication

### POST `/api/auth/[...nextauth]`
NextAuth v4 catch-all route handling signin, signout, session, and CSRF.

**Providers:** Credentials (email + password with bcrypt verification)
**Strategy:** JWT (stateless, no session table)

### POST `/api/auth/signup`
Create a new user account.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "id": "clx...",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Errors:**
- `400` — Missing fields or email already exists
- `500` — Server error

---

## Events

### GET `/api/events`
List events with optional filters. Includes correlations for each event.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `severity` | number | Minimum severity threshold (1-10) |
| `region` | string | Filter by region name |
| `countryCode` | string | Filter by ISO country code |
| `limit` | number | Max events returned (default: 100) |
| `offset` | number | Pagination offset |

**Response (200):**
```json
{
  "events": [
    {
      "id": "clx...",
      "title": "OPEC agrees to cut oil output",
      "summary": "The organization agreed to reduce...",
      "source": "Reuters",
      "region": "Middle East",
      "countryCode": "SA",
      "severity": 8,
      "sentimentScore": 0.44,
      "sentimentLabel": "positive",
      "url": "https://...",
      "publishedAt": "2026-03-23T10:30:00Z",
      "createdAt": "2026-03-23T10:35:00Z",
      "correlations": [
        {
          "id": "clx...",
          "symbol": "USO",
          "impactScore": 0.85,
          "impactDirection": "up",
          "impactMagnitude": 2.3
        }
      ]
    }
  ],
  "total": 1338
}
```

**Auth required:** No

### GET `/api/events/[id]`
Get a single event by ID with full correlation details.

**Response (200):**
```json
{
  "id": "clx...",
  "title": "...",
  "summary": "...",
  "source": "Reuters",
  "region": "Middle East",
  "countryCode": "SA",
  "severity": 8,
  "sentimentScore": 0.44,
  "sentimentLabel": "positive",
  "url": "https://...",
  "publishedAt": "2026-03-23T10:30:00Z",
  "correlations": [
    {
      "symbol": "USO",
      "impactScore": 0.85,
      "impactDirection": "up",
      "impactMagnitude": 2.3,
      "window": "24h",
      "timestamp": "2026-03-23T10:35:00Z"
    }
  ]
}
```

**Errors:**
- `404` — Event not found
- `400` — Invalid ID

---

## Market Data

### GET `/api/markets/quotes`
Fetch live stock quotes from Google Finance.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `symbols` | string | Comma-separated symbols (e.g., "SPY,NVDA,GLD") |

**Response (200):**
```json
{
  "quotes": {
    "SPY": { "price": 512.34, "changePct": 0.45 },
    "NVDA": { "price": 875.20, "changePct": -1.23 },
    "GLD": { "price": 198.50, "changePct": 0.82 }
  },
  "cached": false
}
```

**Caching:** 2-minute cache with stale-on-error fallback. If Google Finance is unreachable, returns last cached values.

**Auth required:** No

### GET `/api/stocks/[symbol]`
Get detailed data for a single stock symbol including related events.

**Response (200):**
```json
{
  "symbol": "USO",
  "quote": { "price": 78.50, "changePct": 2.3 },
  "correlations": [
    {
      "event": {
        "id": "clx...",
        "title": "OPEC agrees to cut output",
        "severity": 8,
        "publishedAt": "2026-03-23T10:30:00Z"
      },
      "impactDirection": "up",
      "impactMagnitude": 2.3
    }
  ],
  "patterns": [
    {
      "eventCategory": "Energy",
      "avgImpactPct": 2.33,
      "direction": "up",
      "confidence": 0.94,
      "occurrences": 47
    }
  ]
}
```

**Auth required:** No

---

## Patterns & Predictions

### GET `/api/patterns`
List learned patterns, optionally filtered.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `category` | string | Filter by event category |
| `symbol` | string | Filter by symbol |

**Response (200):**
```json
{
  "patterns": [
    {
      "id": "clx...",
      "eventCategory": "Energy",
      "symbol": "USO",
      "avgImpactPct": 2.33,
      "direction": "up",
      "confidence": 0.94,
      "occurrences": 47,
      "updatedAt": "2026-03-23T12:00:00Z"
    }
  ]
}
```

Ordered by confidence (highest first).

**Auth required:** No

### GET `/api/patterns/predict`
Get market predictions for a specific event based on historical patterns.

**Query Parameters:**
| Param | Type | Description |
|---|---|---|
| `eventId` | string | The event ID to generate predictions for |

**Response (200):**
```json
{
  "predictions": [
    {
      "symbol": "USO",
      "direction": "up",
      "avgImpactPct": 2.33,
      "confidence": 0.94,
      "occurrences": 47,
      "eventCategory": "Energy"
    }
  ]
}
```

**Auth required:** No

---

## User Preferences

### GET `/api/preferences`
Get the authenticated user's preferences.

**Response (200):**
```json
{
  "id": "clx...",
  "categories": "[\"energy\",\"conflict\",\"technology\"]",
  "regions": "[\"Middle East\",\"Asia-Pacific\"]",
  "symbols": "[\"SPY\",\"NVDA\",\"GLD\"]",
  "onboarded": true
}
```

Note: `categories`, `regions`, and `symbols` are JSON-encoded strings (SQLite doesn't support arrays). Parse with `JSON.parse()` on the client.

**Auth required:** Yes

### POST `/api/preferences`
Create preferences for a new user (during onboarding).

**Body:**
```json
{
  "categories": ["energy", "conflict", "technology"],
  "regions": ["Middle East", "Asia-Pacific"],
  "symbols": ["SPY", "NVDA", "GLD"],
  "onboarded": true
}
```

**Response (201):** Created preference object

**Auth required:** Yes

### PUT `/api/preferences`
Update existing preferences.

**Body:** Same shape as POST

**Response (200):** Updated preference object

**Auth required:** Yes

---

## Watchlists

### GET `/api/watchlists`
List the authenticated user's watchlists.

**Response (200):**
```json
{
  "watchlists": [
    {
      "id": "clx...",
      "name": "Energy Watchlist",
      "items": [
        {
          "symbol": "USO",
          "name": "United States Oil Fund",
          "assetClass": "ETF"
        }
      ]
    }
  ]
}
```

**Auth required:** Yes

### POST `/api/watchlists`
Create a new watchlist.

**Body:**
```json
{
  "name": "My Watchlist"
}
```

**Auth required:** Yes

### POST `/api/watchlists/items`
Add an item to a watchlist.

**Body:**
```json
{
  "watchlistId": "clx...",
  "symbol": "NVDA",
  "name": "NVIDIA",
  "assetClass": "Stock"
}
```

**Auth required:** Yes

---

## Alerts

### GET `/api/alerts`
List the authenticated user's alerts.

**Response (200):**
```json
{
  "alerts": [
    {
      "id": "clx...",
      "name": "High severity energy event",
      "condition": "category:energy AND severity:>=8",
      "status": "armed",
      "createdAt": "2026-03-23T08:00:00Z"
    }
  ]
}
```

**Auth required:** Yes

### POST `/api/alerts`
Create a new alert.

**Body:**
```json
{
  "name": "Oil crisis alert",
  "condition": "category:energy AND severity:>=8"
}
```

**Auth required:** Yes

---

## System

### GET `/api/status`
Get system health and statistics.

**Response (200):**
```json
{
  "lastIngestion": {
    "status": "success",
    "eventsFound": 47,
    "finishedAt": "2026-03-23T12:00:00Z"
  },
  "counts": {
    "events": 1338,
    "correlations": 4075,
    "patterns": 183
  },
  "last24h": {
    "events": 127
  }
}
```

**Auth required:** No

### POST `/api/sync`
Manually trigger an ingestion cycle.

**Response (200):**
```json
{
  "status": "started",
  "message": "Ingestion cycle triggered"
}
```

**Auth required:** Yes

### POST `/api/cron/ingest`
Automated ingestion trigger (for cron jobs / Vercel Cron).

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response (200):**
```json
{
  "count": 47,
  "errors": []
}
```

**Auth required:** CRON_SECRET token

---

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

Common HTTP status codes:
- `400` — Bad request (missing/invalid parameters)
- `401` — Unauthorized (no session or invalid token)
- `404` — Resource not found
- `405` — Method not allowed
- `500` — Internal server error

---

## Rate Limits

No rate limiting is implemented in the MVP. For production deployment, consider:
- Quote endpoint: 30 req/min (Google Finance scraping)
- Ingestion endpoint: 1 req/5min (prevent duplicate cycles)
- General API: 100 req/min per IP
