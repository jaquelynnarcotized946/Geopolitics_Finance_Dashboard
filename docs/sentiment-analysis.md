# GeoPulse Intelligence — Sentiment Analysis System

## Overview

GeoPulse uses **VADER** (Valence Aware Dictionary and sEntiment Reasoner) for sentiment analysis on every ingested event. VADER runs entirely locally — no API key, no cloud service, $0 cost. It classifies each event as positive, negative, or neutral with a compound score from -1.0 to +1.0.

**Source file:** `src/lib/analysis/sentiment.ts`

---

## Why VADER?

| Criteria | VADER | FinBERT | Cloud LLM |
|---|---|---|---|
| Cost | Free | Free | $0.01-0.05/event |
| Runs locally | Yes | Yes (heavy) | No (API) |
| Speed | ~1ms/text | ~50ms/text | ~500ms/text |
| Setup | `npm install` | Download 400MB model | API key required |
| Accuracy | Good for headlines | Better for finance text | Best overall |
| Node.js native | Yes | Requires Python bridge | Yes (API) |

**Decision:** VADER is the right choice for MVP — it's fast, free, and good enough for headline-level sentiment. Can upgrade to FinBERT or an LLM API later for premium tier.

---

## How VADER Works

VADER is a rule-based sentiment analyzer specifically tuned for social media and news text. It uses:

1. **Lexicon** — 7,500+ words rated for sentiment intensity (-4 to +4)
2. **Rules** — Handles capitalization ("GREAT" > "great"), punctuation ("good!!!" > "good"), negation ("not good" = negative), degree modifiers ("very good" > "good")
3. **Compound score** — Normalized sum of all word sentiments, ranging from -1.0 (most negative) to +1.0 (most positive)

---

## Implementation

### Core Function

```typescript
import type { SentimentIntensityAnalyzer } from "vader-sentiment";

export interface SentimentResult {
  score: number;       // compound score: -1.0 to +1.0
  label: "positive" | "negative" | "neutral";
  pos: number;         // positive proportion (0-1)
  neg: number;         // negative proportion (0-1)
  neu: number;         // neutral proportion (0-1)
}

// Dynamic import for CommonJS compatibility
let vaderModule: typeof import("vader-sentiment") | null = null;
async function getVader() {
  if (!vaderModule) {
    vaderModule = await import("vader-sentiment");
  }
  return vaderModule;
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const vader = await getVader();
  const intensity = vader.SentimentIntensityAnalyzer.polarity_scores(text);

  let label: SentimentResult["label"] = "neutral";
  if (intensity.compound >= 0.05) label = "positive";
  else if (intensity.compound <= -0.05) label = "negative";

  return {
    score: intensity.compound,
    label,
    pos: intensity.pos,
    neg: intensity.neg,
    neu: intensity.neu,
  };
}
```

### Classification Thresholds

```
Compound Score ≥ +0.05  →  POSITIVE  (green indicator)
Compound Score ≤ -0.05  →  NEGATIVE  (red indicator)
-0.05 < Score < +0.05   →  NEUTRAL   (gray indicator)
```

These thresholds follow the VADER author's recommended defaults.

### Batch Processing

After each ingestion cycle, unlabeled events are processed in batch:

```typescript
export async function analyzeEventSentiments(): Promise<void> {
  // Query up to 200 events without sentiment labels
  const events = await prisma.event.findMany({
    where: { sentimentLabel: null },
    take: 200,
    select: { id: true, title: true, summary: true },
  });

  for (const event of events) {
    const text = `${event.title} ${event.summary || ""}`;
    const result = await analyzeSentiment(text);

    await prisma.event.update({
      where: { id: event.id },
      data: {
        sentimentScore: result.score,
        sentimentLabel: result.label,
      },
    });
  }
}
```

---

## Database Storage

Sentiment data is stored directly on the Event model:

```prisma
model Event {
  // ... other fields
  sentimentScore  Float?    // -1.0 to +1.0 (null = not yet analyzed)
  sentimentLabel  String?   // "positive", "negative", "neutral"
}
```

- `null` values indicate the event hasn't been analyzed yet
- Events are processed FIFO (oldest unanalyzed first)
- 200 events per batch prevents blocking the ingestion pipeline

---

## Pipeline Integration

Sentiment analysis runs as Stage 5 of the ingestion pipeline, after correlation and pattern steps:

```
Ingest Events → Generate Correlations → Aggregate Patterns → Analyze Sentiments
                                                                    ▲
                                                                    │
                                                              Called from
                                                         src/lib/ingest/events.ts
```

This ordering ensures that:
1. Events exist in the database before sentiment is analyzed
2. Correlations aren't blocked by sentiment analysis
3. Failed sentiment analysis doesn't prevent event storage

---

## UI Display

### Event Cards (Dashboard)

Each event card in `EventMarketPanel.tsx` shows a sentiment indicator:

```
┌──────────────────────────────────────────────┐
│  ⚡ OPEC Agrees to Cut Oil Output            │
│  Source: Reuters · 2h ago · Severity: 8      │
│  ↑ Positive (0.72)                           │  ← Green text
│                                              │
│  Affected: USO +2.3%  XLE +1.8%             │
└──────────────────────────────────────────────┘
```

Indicators:
- **↑ Positive** — Green text with upward arrow
- **↓ Negative** — Red text with downward arrow
- **— Neutral** — Gray text with dash

### Daily Digest

The digest page (`/digest`) includes a sentiment summary section showing:
- Overall sentiment distribution (% positive / negative / neutral)
- Most positive and most negative events of the day
- Sentiment trend over time

---

## CommonJS Compatibility

VADER is distributed as a CommonJS module. Since Next.js 16 uses ESM, the module is loaded via dynamic import:

```typescript
// This avoids "require is not defined" errors in ESM context
let vaderModule: typeof import("vader-sentiment") | null = null;
async function getVader() {
  if (!vaderModule) {
    vaderModule = await import("vader-sentiment");
  }
  return vaderModule;
}
```

The type declaration file (`src/types/vader-sentiment.d.ts`) provides TypeScript types:

```typescript
declare module "vader-sentiment" {
  export const SentimentIntensityAnalyzer: {
    polarity_scores(text: string): {
      compound: number;
      pos: number;
      neg: number;
      neu: number;
    };
  };
}
```

---

## Examples

| Headline | Compound | Label |
|---|---|---|
| "OPEC agrees to historic oil production cut" | +0.44 | Positive |
| "Russia launches missile strikes on Ukraine" | -0.87 | Negative |
| "Federal Reserve holds interest rates steady" | +0.02 | Neutral |
| "Gold prices surge amid global uncertainty" | +0.34 | Positive |
| "Trade war escalates as new tariffs announced" | -0.65 | Negative |
| "China GDP growth meets analyst expectations" | +0.28 | Positive |
| "Massive cyberattack disrupts critical infrastructure" | -0.78 | Negative |

---

## Future Upgrades

1. **FinBERT** — Financial domain-specific BERT model for more accurate financial sentiment. Heavier (400MB model) but more accurate for market-related text.
2. **an LLM API** — For premium tier users, generate paragraph-length analysis explaining market implications. Cost: ~$3-5/month for 500 events/day.
3. **Aspect-based sentiment** — Instead of overall sentiment, detect sentiment per entity ("positive for oil, negative for airlines").
4. **Sentiment trends** — Track sentiment changes over time for specific topics/regions and alert when sentiment shifts sharply.
