import { prisma } from "../prisma";

/**
 * Aggregate correlations into patterns for prediction.
 * Groups by (eventCategory, symbol) and computes running stats.
 */
export async function aggregatePatterns() {
  // Only load the fields needed for the aggregate model.
  const correlations = await prisma.correlation.findMany({
    select: {
      symbol: true,
      impactMagnitude: true,
      impactDirection: true,
      event: {
        select: {
          category: true,
        },
      },
    },
  });

  // Group by category + symbol
  const groups = new Map<
    string,
    { category: string; symbol: string; impacts: number[]; directions: string[] }
  >();

  for (const corr of correlations) {
    const category = corr.event.category || "general";
    const key = `${category}:${corr.symbol}`;

    if (!groups.has(key)) {
      groups.set(key, { category, symbol: corr.symbol, impacts: [], directions: [] });
    }
    const group = groups.get(key)!;
    group.impacts.push(corr.impactMagnitude);
    group.directions.push(corr.impactDirection);
  }

  const patternRows: Array<{
    eventCategory: string;
    symbol: string;
    avgImpactPct: number;
    direction: string;
    confidence: number;
    occurrences: number;
  }> = [];

  for (const group of Array.from(groups.values())) {
    if (group.impacts.length < 2) continue; // Need at least 2 data points

    const avgImpact = group.impacts.reduce((a, b) => a + b, 0) / group.impacts.length;
    const upCount = group.directions.filter((d) => d === "up").length;
    const downCount = group.directions.filter((d) => d === "down").length;
    const dominantDirection = upCount >= downCount ? "up" : "down";
    const directionConsistency =
      Math.max(upCount, downCount) / group.directions.length;
    const confidence = Math.min(1.0, (group.impacts.length / 20) * directionConsistency);

    patternRows.push({
      eventCategory: group.category,
      symbol: group.symbol,
      avgImpactPct: Math.round(avgImpact * 100) / 100,
      direction: dominantDirection,
      confidence: Math.round(confidence * 100) / 100,
      occurrences: group.impacts.length,
    });
  }

  await prisma.$transaction([
    prisma.pattern.deleteMany({}),
    prisma.pattern.createMany({
      data: patternRows,
    }),
  ]);

  return { patternsUpserted: patternRows.length };
}
