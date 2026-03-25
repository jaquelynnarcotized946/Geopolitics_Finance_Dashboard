import { prisma } from "../prisma";

/**
 * Aggregate correlations into patterns for prediction.
 * Groups by (eventCategory, symbol) and computes running stats.
 */
export async function aggregatePatterns() {
  // Get all correlations with their events
  const correlations = await prisma.correlation.findMany({
    include: { event: true },
  });

  // Group by category + symbol
  const groups = new Map<
    string,
    { category: string; symbol: string; impacts: number[]; directions: string[] }
  >();

  for (const corr of correlations) {
    const category = categorizeFromEvent(corr.event.title, corr.event.summary);
    const key = `${category}:${corr.symbol}`;

    if (!groups.has(key)) {
      groups.set(key, { category, symbol: corr.symbol, impacts: [], directions: [] });
    }
    const group = groups.get(key)!;
    group.impacts.push(corr.impactMagnitude);
    group.directions.push(corr.impactDirection);
  }

  let patternsUpserted = 0;

  for (const group of Array.from(groups.values())) {
    if (group.impacts.length < 2) continue; // Need at least 2 data points

    const avgImpact = group.impacts.reduce((a, b) => a + b, 0) / group.impacts.length;
    const upCount = group.directions.filter((d) => d === "up").length;
    const downCount = group.directions.filter((d) => d === "down").length;
    const dominantDirection = upCount >= downCount ? "up" : "down";
    const directionConsistency =
      Math.max(upCount, downCount) / group.directions.length;
    const confidence = Math.min(1.0, (group.impacts.length / 20) * directionConsistency);

    await prisma.pattern.upsert({
      where: {
        eventCategory_symbol: {
          eventCategory: group.category,
          symbol: group.symbol,
        },
      },
      update: {
        avgImpactPct: Math.round(avgImpact * 100) / 100,
        direction: dominantDirection,
        confidence: Math.round(confidence * 100) / 100,
        occurrences: group.impacts.length,
      },
      create: {
        eventCategory: group.category,
        symbol: group.symbol,
        avgImpactPct: Math.round(avgImpact * 100) / 100,
        direction: dominantDirection,
        confidence: Math.round(confidence * 100) / 100,
        occurrences: group.impacts.length,
      },
    });
    patternsUpserted++;
  }

  return { patternsUpserted };
}

function categorizeFromEvent(title: string, summary: string): string {
  const text = `${title} ${summary}`.toLowerCase();

  const categories = [
    { name: "conflict", keywords: ["attack", "missile", "strike", "war", "invasion", "military", "troops", "bombing"] },
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
