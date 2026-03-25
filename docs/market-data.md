# GeoPulse Intelligence — Market Data System

## Overview

GeoPulse fetches live stock/ETF quotes from **Google Finance** via HTML scraping and displays interactive charts using **TradingView** embedded widgets. No API keys required. $0 cost.

**Source files:**
- `src/lib/sources/yahoo.ts` — Google Finance quote scraper (file named yahoo.ts for historical reasons — originally used yahoo-finance2)
- `src/components/ui/TradingViewChart.tsx` — TradingView widget components

---

## Google Finance Quote Scraping

### Why Google Finance?

| Approach | Status | Cost |
|---|---|---|
| yahoo-finance2 npm | Broken (API changed) | Free |
| Yahoo Finance API | Requires paid key | $$ |
| Alpha Vantage | 5 calls/min free tier | Free/Paid |
| **Google Finance HTML** | **Working, reliable** | **Free** |
| IEX Cloud | Requires API key | Paid |

Google Finance HTML pages contain price data in structured `data-*` attributes, making scraping reliable without API key overhead.

### How It Works

```
Request: GET https://www.google.com/finance/quote/SPY:NYSEARCA
                                                        │
                                                        ▼
Parse HTML → Extract data-last-price attribute → $512.34
           → Extract previous close → Calculate % change
```

### Symbol-to-Exchange Mapping

Google Finance requires exchange suffix. The scraper maps symbols automatically:

```typescript
const EXCHANGE_MAP: Record<string, string> = {
  // Major ETFs
  SPY: "NYSEARCA", QQQ: "NASDAQ", EEM: "NYSEARCA",
  GLD: "NYSEARCA", TLT: "NASDAQ", USO: "NYSEARCA",
  ITA: "NYSEARCA", XLE: "NYSEARCA", XLV: "NYSEARCA",
  XLF: "NYSEARCA", SMH: "NASDAQ", VXX: "CBOE",

  // Stocks
  NVDA: "NASDAQ", MSFT: "NASDAQ", AAPL: "NASDAQ",
  TSM: "NYSE", LMT: "NYSE", RTX: "NYSE",
  XOM: "NYSE", CVX: "NYSE", PFE: "NYSE",

  // Country ETFs
  FXI: "NYSEARCA", EWJ: "NYSEARCA", EWT: "NYSEARCA",
  INDA: "NASDAQ", EWY: "NYSEARCA",

  // Commodities/Alternatives
  WEAT: "NYSEARCA", CORN: "NYSEARCA", URA: "NYSEARCA",
  BITO: "NYSEARCA", ICLN: "NASDAQ",
  // ... 60+ symbols total
};
```

### Batch Processing

Quotes are fetched in batches of 5 using `Promise.allSettled`:

```typescript
async function fetchQuotes(symbols: string[]): Promise<QuoteMap> {
  const batches = chunk(symbols, 5);
  const results: QuoteMap = {};

  for (const batch of batches) {
    const settled = await Promise.allSettled(
      batch.map(symbol => fetchSingleQuote(symbol))
    );
    // Process results, skip failures gracefully
  }

  return results;
}
```

### Caching

The `/api/markets/quotes` endpoint caches quotes for 2 minutes:

```
First request:  Fetch from Google Finance → cache → return
Within 2 min:   Return cached data (instant)
After 2 min:    Fetch fresh data → update cache → return
On error:       Return stale cache (better than nothing)
```

### Error Handling

- **Symbol not found:** Returns `{ price: 0, changePct: 0 }` placeholder
- **Network error:** Falls back to cached data or zero-price placeholder
- **Exchange mismatch:** Tries alternative exchanges (NASDAQ → NYSE → NYSEARCA)
- **Futures symbols:** Returns placeholder (Google Finance doesn't support futures)

---

## Supported Symbols (60+)

### ETFs
| Symbol | Name | Category |
|---|---|---|
| SPY | S&P 500 ETF | US Market Index |
| QQQ | Nasdaq 100 ETF | US Tech Index |
| EEM | Emerging Markets ETF | International |
| GLD | Gold ETF | Safe Haven |
| TLT | 20+ Year Treasury ETF | Bonds |
| USO | US Oil Fund | Energy |
| UNG | US Natural Gas Fund | Energy |
| XLE | Energy Select Sector | Energy |
| XLV | Health Care Select | Healthcare |
| XLF | Financial Select | Financials |
| XLI | Industrial Select | Industrials |
| ITA | US Aerospace & Defense | Defense |
| SMH | VanEck Semiconductor | Technology |
| ICLN | iShares Clean Energy | Green Energy |
| TAN | Solar ETF | Green Energy |
| HACK | Cybersecurity ETF | Technology |
| XBI | Biotech ETF | Healthcare |
| BDRY | Dry Bulk Shipping | Shipping |
| WEAT | Wheat ETF | Agriculture |
| CORN | Corn ETF | Agriculture |
| DBA | Agriculture ETF | Agriculture |
| VXX | Volatility Index | Volatility |
| BITO | Bitcoin Strategy | Crypto |
| URA | Uranium ETF | Nuclear |
| UUP | US Dollar Index | Currency |
| FXE | Euro Currency | Currency |
| TIP | TIPS Bond ETF | Inflation |
| IYR | Real Estate ETF | Real Estate |

### Country ETFs
| Symbol | Name | Country |
|---|---|---|
| FXI | China Large-Cap | China |
| EWJ | Japan ETF | Japan |
| EWT | Taiwan ETF | Taiwan |
| EWY | South Korea ETF | South Korea |
| INDA | India ETF | India |
| RSX | Russia ETF | Russia |
| EWZ | Brazil ETF | Brazil |
| EWW | Mexico ETF | Mexico |

### Individual Stocks
| Symbol | Name | Sector |
|---|---|---|
| NVDA | NVIDIA | Semiconductors |
| MSFT | Microsoft | Technology |
| AAPL | Apple | Technology |
| TSM | Taiwan Semiconductor | Semiconductors |
| LMT | Lockheed Martin | Defense |
| RTX | Raytheon | Defense |
| NOC | Northrop Grumman | Defense |
| GD | General Dynamics | Defense |
| XOM | ExxonMobil | Energy |
| CVX | Chevron | Energy |
| PFE | Pfizer | Healthcare |
| MRNA | Moderna | Healthcare |
| IBM | IBM | Technology |
| PANW | Palo Alto Networks | Cybersecurity |
| CCJ | Cameco | Uranium |

---

## TradingView Integration

### Widgets Used

Three TradingView widget types are embedded via iframe/script injection:

#### 1. Advanced Chart (`TradingViewChart`)
Full interactive candlestick chart with volume, indicators, and drawing tools. Used on the stock detail page (`/stock/[symbol]`).

```typescript
// Usage in stock/[symbol].tsx
<TradingViewChart symbol={symbol} />
```

Features:
- Candlestick chart with OHLC data
- Volume bars
- Moving averages, RSI, MACD (user-selectable)
- Timeframe selection (1D, 1W, 1M, 3M, 1Y, 5Y)
- Drawing tools (trendlines, fibonacci, etc.)
- Dark theme matching GeoPulse UI

#### 2. Mini Chart (`MiniChart`)
Compact area chart showing recent price action. Used on event detail pages for each affected stock.

```typescript
// Usage in event/[id].tsx
<MiniChart symbol={symbol} />
```

Features:
- Area/line chart
- Last 30 days of data
- Compact size (fits in a card alongside event data)
- Dark theme

#### 3. Symbol Overview (`SymbolOverview`)
Tabbed widget showing price, chart, and key statistics. Used for quick reference.

### Implementation

TradingView widgets are loaded via `<script>` injection into a container div:

```typescript
function TradingViewChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: mapToTradingViewSymbol(symbol),
      theme: "dark",
      width: "100%",
      height: 500,
      // ... widget config
    });
    containerRef.current?.appendChild(script);

    return () => { /* cleanup */ };
  }, [symbol]);

  return <div ref={containerRef} />;
}
```

### Symbol Mapping for TradingView

TradingView uses different symbol format than Google Finance:

```
GeoPulse symbol  →  TradingView symbol
SPY              →  AMEX:SPY
NVDA             →  NASDAQ:NVDA
GLD              →  AMEX:GLD
TSM              →  NYSE:TSM
```

---

## Data Flow Summary

```
┌─────────────────────┐     ┌──────────────────────┐
│  Google Finance     │     │  TradingView CDN     │
│  (HTML scraping)    │     │  (widgets)           │
└──────────┬──────────┘     └──────────┬───────────┘
           │                           │
    Server-side fetch           Client-side embed
           │                           │
           ▼                           ▼
┌──────────────────┐        ┌──────────────────────┐
│ /api/markets/    │        │  Stock Detail Page    │
│ quotes endpoint  │        │  Event Detail Page    │
│ (2min cache)     │        │  (live TradingView)   │
└──────────┬───────┘        └──────────────────────┘
           │
           ▼
┌──────────────────┐
│  SWR useQuotes   │
│  hook (client)   │
│  → Dashboard     │
│  → Event cards   │
│  → Stock prices  │
└──────────────────┘
```
