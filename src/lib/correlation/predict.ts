import { prisma } from "../prisma";
import { categorizeEvent } from "../intelligence";

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

  const category = categorizeEvent(event.title, event.summary);
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
  const category = categorizeEvent(title, summary);
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
