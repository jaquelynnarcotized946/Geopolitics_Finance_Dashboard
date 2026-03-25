import { prisma } from "../prisma";

export type Prediction = {
  symbol: string;
  direction: string;
  avgImpactPct: number;
  confidence: number;
  occurrences: number;
  category: string;
};

/**
 * Get predictions for a specific event based on historical patterns.
 */
export async function predictForEvent(eventId: string): Promise<Prediction[]> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return [];

  const category = categorize(event.title, event.summary);
  if (category === "general") return [];

  const patterns = await prisma.pattern.findMany({
    where: {
      eventCategory: category,
      confidence: { gte: 0.2 },
    },
    orderBy: { confidence: "desc" },
    take: 10,
  });

  return patterns.map((p) => ({
    symbol: p.symbol,
    direction: p.direction,
    avgImpactPct: p.avgImpactPct,
    confidence: p.confidence,
    occurrences: p.occurrences,
    category: p.eventCategory,
  }));
}

/**
 * Get predictions for a text query (for new/incoming events).
 */
export async function predictForText(
  title: string,
  summary: string
): Promise<Prediction[]> {
  const category = categorize(title, summary);
  if (category === "general") return [];

  const patterns = await prisma.pattern.findMany({
    where: {
      eventCategory: category,
      confidence: { gte: 0.2 },
    },
    orderBy: { confidence: "desc" },
    take: 10,
  });

  return patterns.map((p) => ({
    symbol: p.symbol,
    direction: p.direction,
    avgImpactPct: p.avgImpactPct,
    confidence: p.confidence,
    occurrences: p.occurrences,
    category: p.eventCategory,
  }));
}

function categorize(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();
  const categories = [
    { name: "conflict", keywords: ["attack", "missile", "strike", "war", "invasion", "military", "troops"] },
    { name: "threat", keywords: ["nuclear", "threat", "crisis", "emergency", "escalation", "terror"] },
    { name: "sanctions", keywords: ["sanction", "embargo", "tariff", "ban", "restriction", "trade war"] },
    { name: "energy", keywords: ["oil", "opec", "pipeline", "natural gas", "crude", "energy"] },
    { name: "economic", keywords: ["recession", "inflation", "default", "debt", "rate hike", "rate cut"] },
    { name: "political", keywords: ["election", "protest", "coup", "revolution", "unrest"] },
  ];

  let best = "general";
  let bestScore = 0;
  for (const cat of categories) {
    const score = cat.keywords.filter((k) => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat.name;
    }
  }
  return best;
}
