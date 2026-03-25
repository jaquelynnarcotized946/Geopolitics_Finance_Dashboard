# GeoPulse Intelligence — Correlation Engine

## Overview

The correlation engine is the core intelligence layer of GeoPulse. It analyzes event text (title + summary) against 174 keyword-to-symbol mappings to determine which financial instruments are affected by geopolitical events, and in which direction.

**Source file:** `src/lib/correlation/matchEvents.ts`

---

## How It Works

```
Event Text                    Correlation Map              Output
─────────────                ────────────────             ──────
"OPEC agrees to     ──►     "oil" → USO, XLE,    ──►    Correlation {
 cut oil output              XOM, CVX                      symbol: "USO"
 by 2M barrels"              direction: "up"                impactDirection: "up"
                             category: "energy"             impactMagnitude: 2.3%
                                                           impactScore: 0.85
                                                         }
```

### Step-by-step:

1. **Text preparation** — Combine event title + summary into searchable text
2. **Keyword matching** — Test each of 174 correlation entries against the text using word-boundary regex
3. **False positive filtering** — Guard against substring false matches (e.g., "turmoil" ≠ "oil")
4. **Impact scoring** — Calculate match strength based on keyword count and source quality
5. **Live quote fetch** — Get current price from Google Finance to determine actual magnitude
6. **Correlation creation** — Store link between event and symbol with direction + magnitude

---

## The Correlation Map

174 entries organized into 17 categories:

### Energy
| Keywords | Symbols | Direction |
|---|---|---|
| oil, crude, petroleum, opec, barrel | USO, XLE, XOM, CVX | up |
| natural gas, lng, pipeline | UNG, XLE | up |
| solar, wind, renewable, clean energy | ICLN, TAN | up |
| energy crisis, power outage, blackout | XLE, USO | up |

### Defense & Military
| Keywords | Symbols | Direction |
|---|---|---|
| military, defense, arms, weapon | ITA, LMT, RTX, NOC, GD | up |
| missile, strike, combat, troops | ITA, LMT, RTX | up |
| nato, alliance, pact | ITA, LMT | up |
| war, invasion, conflict | GLD, ITA, VXX | up |

### Safe Havens
| Keywords | Symbols | Direction |
|---|---|---|
| gold, bullion, precious metal | GLD | up |
| crisis, uncertainty, fear | GLD, VXX | up |
| treasury, bond, safe haven | TLT | up |
| bitcoin, crypto, digital currency | BITO | up |

### Country-Specific
| Keywords | Symbols | Direction |
|---|---|---|
| china, beijing, chinese | FXI | varies |
| taiwan, tsmc, semiconductor | TSM, EWT | varies |
| russia, moscow, kremlin | RSX | varies |
| japan, tokyo, bank of japan | EWJ | varies |
| india, mumbai, modi | INDA | varies |
| south korea, samsung, seoul | EWY | varies |

### Monetary Policy
| Keywords | Symbols | Direction |
|---|---|---|
| the fed, fed chair, fed rate, fed policy | SPY, TLT, XLF | varies |
| interest rate, rate hike, rate cut | TLT, XLF, IYR | varies |
| inflation, cpi, consumer prices | TLT, GLD, TIP | varies |
| central bank, monetary policy | SPY, TLT | varies |

### Trade & Tariffs
| Keywords | Symbols | Direction |
|---|---|---|
| tariff, trade war, import duty | SPY, EEM, XLI | down |
| sanction, embargo, restriction | varies | varies |
| supply chain, shipping, logistics | BDRY, XLI | varies |
| export ban, import restriction | EEM, SPY | down |

### Technology
| Keywords | Symbols | Direction |
|---|---|---|
| semiconductor, chip, foundry | SMH, NVDA, TSM | varies |
| artificial intelligence, ai, machine learning | QQQ, NVDA, MSFT | up |
| cyber, hack, data breach | HACK, PANW | varies |
| quantum computing | QQQ, IBM | up |

### Healthcare
| Keywords | Symbols | Direction |
|---|---|---|
| pandemic, virus, outbreak | XLV, XBI | varies |
| vaccine, fda approval | XBI, PFE, MRNA | up |
| drug, pharmaceutical | XLV, XBI | varies |

### Climate & Environment
| Keywords | Symbols | Direction |
|---|---|---|
| climate, carbon, emissions | ICLN, XLE | varies |
| hurricane, flood, disaster | SPY | down |
| renewable, green energy | ICLN, TAN | up |

### Agriculture
| Keywords | Symbols | Direction |
|---|---|---|
| wheat, grain, crop | WEAT | up |
| corn, maize, ethanol | CORN | up |
| food crisis, famine, drought | DBA, WEAT | up |

### Elections & Political
| Keywords | Symbols | Direction |
|---|---|---|
| election, vote, ballot | SPY, VXX | varies |
| coup, revolution, overthrow | GLD, VXX | up |
| parliament, legislation, reform | SPY | varies |

### Nuclear
| Keywords | Symbols | Direction |
|---|---|---|
| nuclear, atomic, warhead | GLD, ITA, SPY | varies |
| uranium, enrichment | URA, CCJ | up |
| nuclear deal, nonproliferation | USO | varies |

### Financial Markets
| Keywords | Symbols | Direction |
|---|---|---|
| recession, downturn, contraction | SPY, TLT, GLD, XLF | varies |
| stimulus, bailout, quantitative easing | SPY, GLD | up |
| debt crisis, default, sovereign debt | TLT, GLD | varies |
| stock market crash, selloff | VXX, GLD | up |

### Shipping & Logistics
| Keywords | Symbols | Direction |
|---|---|---|
| shipping, freight, port | BDRY, XLI | varies |
| suez, strait, canal | USO, BDRY | up |
| blockade, naval | USO, BDRY | up |

### International Organizations
| Keywords | Symbols | Direction |
|---|---|---|
| eu summit, eu sanctions, eu policy | EEM, GLD | varies |
| united nations, un resolution | ITA, GLD | varies |
| imf, world bank | EEM, SPY | varies |

---

## Word-Boundary Matching

The engine uses regex word-boundary matching instead of substring matching to prevent false positives:

```typescript
// BAD (old approach):
text.includes("oil")  // matches "turmoil", "soil", "foil"

// GOOD (current approach):
/\boil\b/i.test(text)  // matches only standalone "oil"
```

### Regex Caching

Compiled regex patterns are cached for performance:

```typescript
const regexCache = new Map<string, RegExp>();

function getKeywordRegex(keyword: string): RegExp {
  let r = regexCache.get(keyword);
  if (!r) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    r = new RegExp(`\\b${escaped}\\b`, "i");
    regexCache.set(keyword, r);
  }
  return r;
}
```

---

## False Positive Guards

Additional protection against tricky substring matches:

```typescript
const FALSE_POSITIVE_GUARDS: Record<string, RegExp> = {
  oil:   /\b(?:turmoil|soil|foil|recoil|toil|broil|oily)\b/i,
  war:   /\b(?:warn|warden|warrant|wardrobe|ward|warm|warp|warfare)\b/i,
  arm:   /\b(?:farm|charm|harm|alarm|pharmacy|pharma)\b/i,
  gold:  /\b(?:golden gate|marigold)\b/i,
  chip:  /\b(?:chipmunk)\b/i,
  fed:   /\b(?:federation|fedex|federated)\b/i,
  china: /\b(?:china cabinet|porcelain|fine china)\b/i,
  eu:    /\b(?:queue|eureka|euphoria)\b/i,
};
```

**How guards work:**
1. If keyword "oil" matches the text...
2. Check if any guard word ("turmoil", "soil", etc.) is also present
3. Remove guard words from text and re-test
4. If keyword no longer matches → false positive → skip

---

## Impact Scoring

Each correlation receives an impact score based on:

```
impactScore = baseScore + keywordBonus

baseScore   = 0.5 (default match strength)
keywordBonus = 0.1 * (number of matching keywords - 1)
              (capped at 1.0 total)
```

### Direction Assignment

Direction (up/down/neutral) is determined by:
1. **Correlation map default** — each entry has a default direction
2. **Live quote data** — if Google Finance shows the stock is actually moving opposite, override

### Magnitude Calculation

Impact magnitude comes from live Google Finance data:
- Fetch current price and % change for the symbol
- Use actual market movement as the magnitude
- Fallback: use the pattern's historical average if live data unavailable

---

## Category Assignment

Events are categorized using the same keyword matching:

```typescript
function categorizeEvent(title: string, summary: string): string {
  // Tests text against category-specific keywords
  // Returns: "Conflict", "Energy", "Economic", "Technology",
  //          "Political", "Trade", "Healthcare", "Climate",
  //          "Defense", "Cybersecurity", "Nuclear", "Agriculture",
  //          "Shipping", "Science", "Sanctions", "General"
}
```

Categories are used for:
- Dashboard filter tabs
- Pattern aggregation (group by category + symbol)
- User preference matching ("For You" feed)

---

## Supported Symbols

60+ financial instruments tracked:

**ETFs:** SPY, QQQ, EEM, ITA, XLE, XLV, XLF, XLI, GLD, TLT, USO, UNG, SMH, ICLN, TAN, HACK, XBI, BDRY, WEAT, CORN, DBA, TIP, VXX, BITO, URA, IYR

**Stocks:** NVDA, MSFT, AAPL, TSM, LMT, RTX, NOC, GD, XOM, CVX, PFE, MRNA, IBM, PANW, CCJ

**Country ETFs:** FXI (China), EWJ (Japan), EWT (Taiwan), EWY (S. Korea), INDA (India), RSX (Russia), EWZ (Brazil), EWW (Mexico)

**Currency/Forex:** UUP (USD), FXE (Euro)

---

## Adding New Correlations

To add a new keyword-to-symbol mapping, edit the `CORRELATION_MAP` array in `src/lib/correlation/matchEvents.ts`:

```typescript
{
  keywords: ["lithium", "ev battery", "battery metal"],
  symbols: ["LIT", "ALB", "SQM"],
  direction: "up",
  category: "technology",
}
```

The new mapping will take effect on the next ingestion cycle. No migration needed.
