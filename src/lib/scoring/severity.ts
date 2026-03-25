const CONFLICT_KEYWORDS = [
  "attack", "missile", "strike", "war", "invasion", "bombing", "airstrike",
  "troops", "military", "combat", "casualties", "killed", "explosion",
  "shelling", "offensive", "ceasefire", "artillery", "drone strike",
];

const THREAT_KEYWORDS = [
  "nuclear", "threat", "crisis", "emergency", "escalation", "warning",
  "alert", "terror", "hostage", "assassination", "coup", "martial law",
];

const SANCTION_KEYWORDS = [
  "sanction", "embargo", "tariff", "ban", "restriction", "blacklist",
  "freeze", "seizure", "blockade", "trade war", "export control",
];

const ECONOMIC_KEYWORDS = [
  "recession", "inflation", "default", "debt", "bailout", "collapse",
  "bankruptcy", "crash", "downturn", "unemployment", "rate hike",
  "rate cut", "quantitative", "stimulus",
];

const POLITICAL_KEYWORDS = [
  "election", "protest", "revolution", "unrest", "overthrow", "impeach",
  "resign", "riot", "demonstration", "uprising",
];

const ENERGY_KEYWORDS = [
  "oil", "opec", "pipeline", "natural gas", "energy", "crude",
  "refinery", "lng", "petroleum", "fuel", "shipping lane",
];

const TECHNOLOGY_KEYWORDS = [
  "semiconductor", "chip", "ai", "artificial intelligence", "tech", "cyber",
  "5g", "quantum", "software", "data", "cloud", "satellite", "space",
  "robot", "autonomous", "biotech", "blockchain", "cryptocurrency", "bitcoin",
];

const HEALTHCARE_KEYWORDS = [
  "pandemic", "virus", "vaccine", "outbreak", "epidemic", "who",
  "disease", "drug", "pharmaceutical", "hospital", "health", "covid",
  "bird flu", "fda", "medical",
];

const CLIMATE_KEYWORDS = [
  "climate", "carbon", "emissions", "earthquake", "tsunami", "hurricane",
  "flood", "wildfire", "drought", "renewable", "solar", "wind energy",
  "environmental", "pollution", "deforestation",
];

const AGRICULTURE_KEYWORDS = [
  "wheat", "grain", "crop", "harvest", "famine", "food",
  "agriculture", "corn", "soybean", "livestock", "fertilizer",
];

const TRADE_KEYWORDS = [
  "shipping", "freight", "maritime", "supply chain", "logistics", "port",
  "trade deal", "trade agreement", "import", "export", "customs", "wto",
];

const PROXIMITY_PAIRS: Array<[string, string, number]> = [
  ["nuclear", "threat", 3],
  ["nuclear", "weapon", 3],
  ["missile", "launch", 2.5],
  ["military", "strike", 2],
  ["trade", "war", 2],
  ["oil", "crisis", 2],
  ["interest", "rate", 1.5],
  ["sanctions", "impose", 1.5],
  ["ceasefire", "collapse", 2.5],
  ["troops", "deploy", 2],
];

const ENTITY_SIGNALS: Record<string, number> = {
  "nato": 1.5, "opec": 1.5, "un security council": 2,
  "united nations": 1, "eu": 1, "imf": 1.5, "world bank": 1,
  "federal reserve": 1.5, "ecb": 1.5, "pentagon": 1.5,
  "kremlin": 1.5, "white house": 1, "g7": 1.5, "g20": 1,
  "china": 1.2, "russia": 1.5, "iran": 1.5, "north korea": 2,
  "taiwan": 1.5, "ukraine": 1.5, "israel": 1.2, "saudi": 1,
};

type CategoryWeight = { keywords: string[]; multiplier: number };

const CATEGORIES: CategoryWeight[] = [
  { keywords: CONFLICT_KEYWORDS, multiplier: 1.8 },
  { keywords: THREAT_KEYWORDS, multiplier: 1.6 },
  { keywords: SANCTION_KEYWORDS, multiplier: 1.3 },
  { keywords: ENERGY_KEYWORDS, multiplier: 1.2 },
  { keywords: ECONOMIC_KEYWORDS, multiplier: 1.1 },
  { keywords: POLITICAL_KEYWORDS, multiplier: 1.0 },
  { keywords: TECHNOLOGY_KEYWORDS, multiplier: 0.9 },
  { keywords: HEALTHCARE_KEYWORDS, multiplier: 1.1 },
  { keywords: CLIMATE_KEYWORDS, multiplier: 0.8 },
  { keywords: AGRICULTURE_KEYWORDS, multiplier: 0.8 },
  { keywords: TRADE_KEYWORDS, multiplier: 1.0 },
];

const SOURCE_WEIGHTS: Record<string, number> = {
  "reuters": 1.3, "ap news": 1.3, "bbc": 1.2, "financial times": 1.2,
  "cnbc": 1.1, "al jazeera": 1.1, "defense news": 1.2,
  "federal reserve": 1.4, "gdelt": 0.9, "npr": 1.1,
};

function getSourceWeight(source: string): number {
  const lowered = source.toLowerCase();
  for (const [key, weight] of Object.entries(SOURCE_WEIGHTS)) {
    if (lowered.includes(key)) return weight;
  }
  return 1.0;
}

export function estimateSeverity(title: string, summary: string, source: string): number {
  const text = `${title} ${summary}`.toLowerCase();

  let keywordScore = 0;
  let bestCategoryMultiplier = 1.0;

  for (const category of CATEGORIES) {
    let hits = 0;
    for (const keyword of category.keywords) {
      if (text.includes(keyword)) hits++;
    }
    if (hits > 0) {
      keywordScore += hits * 0.8;
      if (category.multiplier > bestCategoryMultiplier) {
        bestCategoryMultiplier = category.multiplier;
      }
    }
  }

  let proximityBonus = 0;
  for (const [word1, word2, bonus] of PROXIMITY_PAIRS) {
    if (text.includes(word1) && text.includes(word2)) {
      proximityBonus += bonus;
    }
  }

  let entitySignal = 0;
  for (const [entity, score] of Object.entries(ENTITY_SIGNALS)) {
    if (text.includes(entity)) {
      entitySignal += score;
    }
  }

  const sourceWeight = getSourceWeight(source);

  const raw = (keywordScore * bestCategoryMultiplier + proximityBonus + entitySignal) * sourceWeight;

  return Math.min(10, Math.max(1, Math.round(raw)));
}

export function categorizeEvent(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  const scores: Array<{ category: string; score: number }> = [
    { category: "conflict", score: CONFLICT_KEYWORDS.filter(k => text.includes(k)).length * 1.8 },
    { category: "threat", score: THREAT_KEYWORDS.filter(k => text.includes(k)).length * 1.6 },
    { category: "sanctions", score: SANCTION_KEYWORDS.filter(k => text.includes(k)).length * 1.3 },
    { category: "energy", score: ENERGY_KEYWORDS.filter(k => text.includes(k)).length * 1.2 },
    { category: "economic", score: ECONOMIC_KEYWORDS.filter(k => text.includes(k)).length * 1.1 },
    { category: "political", score: POLITICAL_KEYWORDS.filter(k => text.includes(k)).length * 1.0 },
    { category: "technology", score: TECHNOLOGY_KEYWORDS.filter(k => text.includes(k)).length * 0.9 },
    { category: "healthcare", score: HEALTHCARE_KEYWORDS.filter(k => text.includes(k)).length * 1.1 },
    { category: "climate", score: CLIMATE_KEYWORDS.filter(k => text.includes(k)).length * 0.8 },
    { category: "agriculture", score: AGRICULTURE_KEYWORDS.filter(k => text.includes(k)).length * 0.8 },
    { category: "trade", score: TRADE_KEYWORDS.filter(k => text.includes(k)).length * 1.0 },
  ];

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].category : "general";
}
