# GeoPulse Intelligence — Pattern Learning & Prediction Engine

## Overview

GeoPulse learns from historical event-to-market correlations over time. When an "Energy" event historically causes oil stocks (USO, XLE) to rise 2.3% with 85% confidence across 47 occurrences, that becomes a **pattern**. When a new energy event arrives, the system uses these patterns to **predict** likely market impact.

**Source files:**
- `src/lib/correlation/patterns.ts` — Pattern aggregation
- `src/lib/correlation/predict.ts` — Prediction engine

---

## Pattern Aggregation

### How Patterns Form

After each ingestion cycle, correlations are grouped by `(eventCategory, symbol)` pairs:

```
┌─────────────────────────────────────────────────┐
│  All Correlations                                │
│                                                  │
│  Event: "OPEC cuts output"                       │
│    → USO +2.1%, XLE +1.8%                        │
│                                                  │
│  Event: "Oil prices surge on supply fears"       │
│    → USO +3.4%, XLE +2.7%                        │
│                                                  │
│  Event: "Saudi Arabia extends production cuts"   │
│    → USO +1.5%, XLE +1.2%                        │
└─────────────────┬───────────────────────────────┘
                  │ Aggregate by (category, symbol)
                  ▼
┌─────────────────────────────────────────────────┐
│  Pattern: Energy × USO                           │
│                                                  │
│  avgImpactPct:  2.33%                            │
│  direction:     "up"                             │
│  occurrences:   47                               │
│  confidence:    0.94                             │
└─────────────────────────────────────────────────┘
```

### Aggregation Logic

```typescript
// For each (category, symbol) pair:
pattern = {
  eventCategory: "Energy",
  symbol: "USO",
  avgImpactPct: mean(all impact magnitudes),
  direction: majority direction ("up" if >50% of correlations are "up"),
  occurrences: total count of correlations,
  confidence: calculateConfidence(occurrences, directionConsistency),
}
```

### Stored in Database

```prisma
model Pattern {
  id             String @id @default(cuid())
  eventCategory  String
  symbol         String
  avgImpactPct   Float
  direction      String    // "up" or "down"
  confidence     Float     // 0.0 to 1.0
  occurrences    Int
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

---

## Confidence Scoring

Confidence is calculated from two factors:

```
confidence = min(1.0, (occurrences / 20) * directionConsistency)
```

### Factor 1: Occurrence Count
- More data points = higher confidence
- 20 occurrences = maximum contribution from this factor
- Scales linearly: 5 occurrences = 0.25 base, 10 = 0.50, 20+ = 1.0

### Factor 2: Direction Consistency
- What percentage of correlations agree on direction?
- If 45 out of 47 correlations show "up" → consistency = 45/47 = 0.957
- If 25 out of 47 show "up" → consistency = 25/47 = 0.532

### Examples

| Category × Symbol | Occurrences | Direction Consistency | Confidence |
|---|---|---|---|
| Energy × USO | 47 | 95.7% (45/47 up) | min(1.0, 47/20 × 0.957) = **0.957** |
| Conflict × GLD | 32 | 90.6% (29/32 up) | min(1.0, 32/20 × 0.906) = **0.906** |
| Trade × EEM | 8 | 75.0% (6/8 down) | min(1.0, 8/20 × 0.75) = **0.300** |
| Climate × ICLN | 3 | 100% (3/3 up) | min(1.0, 3/20 × 1.0) = **0.150** |

**Key insight:** A pattern needs both quantity (many occurrences) AND quality (consistent direction) to be confident.

---

## Prediction Engine

### How Predictions Work

When a new event arrives, the prediction engine:

1. **Categorize** the event (Energy, Conflict, Trade, etc.)
2. **Query patterns** matching that category
3. **Filter** by confidence threshold (typically >0.3)
4. **Rank** by confidence × avgImpactPct
5. **Return** predicted market impacts

```
New Event: "Iran threatens to close Strait of Hormuz"
    │
    ▼ categorize → "Energy" + "Conflict"
    │
    ▼ query patterns for "Energy" and "Conflict"
    │
    ▼ Results:
    │
    ├── Energy × USO:  ↑ 2.33% (94% confidence, 47 occurrences)
    ├── Energy × XLE:  ↑ 1.87% (89% confidence, 43 occurrences)
    ├── Conflict × GLD: ↑ 1.45% (91% confidence, 32 occurrences)
    ├── Conflict × ITA: ↑ 2.10% (85% confidence, 28 occurrences)
    └── Conflict × VXX: ↑ 3.20% (78% confidence, 19 occurrences)
```

### API Endpoint

```
GET /api/patterns/predict?eventId=<id>
```

Response:
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

### Prediction Display

Predictions appear on the event detail page (`/event/[id]`) in a dedicated section showing:
- Symbol name with link to stock detail page
- Predicted direction (↑/↓) with color coding
- Average historical impact percentage
- Confidence percentage
- Number of historical occurrences supporting the prediction

---

## Pattern Refresh

Patterns are recalculated after every ingestion cycle:

1. Query all correlations from the last 90 days
2. Group by (eventCategory, symbol)
3. Recalculate avgImpactPct, direction, confidence, occurrences
4. Upsert pattern records (update existing or create new)

This means patterns naturally evolve as new data comes in and old data ages out.

---

## Pattern API

### List All Patterns
```
GET /api/patterns
GET /api/patterns?category=Energy
GET /api/patterns?symbol=USO
```

Response:
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
      "occurrences": 47
    }
  ]
}
```

Patterns are ordered by confidence (highest first).

---

## Viewing Patterns in the UI

### Dashboard — Active Patterns Section
The daily digest page (`/digest`) shows top 5 patterns with highest confidence.

### Event Detail Page
When viewing an event, predictions based on patterns are shown below the event details.

### Stock Detail Page
When viewing a stock, all patterns involving that symbol are listed, showing which event categories historically affect it.

---

## Current Pattern Statistics

As of the latest data:
- **183 patterns** learned across 17 categories
- **4,075 correlations** used for pattern calculation
- **1,338 events** in the database
- Highest confidence patterns are in Energy and Conflict categories (most data available)

---

## Limitations & Future Improvements

1. **Lag** — Patterns use historical data, so they react to new event types slowly
2. **Category granularity** — "Energy" covers both oil and renewables; finer categories would improve accuracy
3. **No temporal decay** — All historical correlations weighted equally (could add recency bias)
4. **No multi-event patterns** — Currently each event is analyzed independently; compound events (e.g., "war + oil cut") aren't modeled as combinations
5. **Future: LLM Analysis** — Could generate natural-language explanations of WHY a pattern exists, not just that it does
