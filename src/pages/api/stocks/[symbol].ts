import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";
import { summarizeEventIntelligence } from "../../../lib/intelligence";
import { buildEventReliability, matchSourceHealth, summarizeSourceHealth } from "../../../lib/reliability";
import { applyPublicReadGuard, sendPublicApiError } from "../../../lib/publicApi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (
    !(await applyPublicReadGuard({
      req,
      res,
      namespace: "stock-read",
      limit: 90,
      windowMs: 60 * 1000,
      cacheControl: "public, s-maxage=60, stale-while-revalidate=300",
    }))
  ) {
    return;
  }

  const { symbol } = req.query as { symbol: string };
  if (!symbol) {
    res.status(400).json({ error: "Missing symbol" });
    return;
  }

  try {
    const normalizedSymbol = symbol.toUpperCase();
    const correlations = await prisma.correlation.findMany({
      where: { symbol: normalizedSymbol },
      orderBy: { event: { publishedAt: "desc" } },
      take: 30,
      include: {
        event: {
          select: {
            id: true,
            title: true,
            summary: true,
            source: true,
            region: true,
            countryCode: true,
            publishedAt: true,
            severity: true,
            url: true,
            category: true,
            supportingSourcesCount: true,
            sourceReliability: true,
          },
        },
      },
    });

    const patterns = await prisma.pattern.findMany({
      where: { symbol: normalizedSymbol },
      orderBy: { confidence: "desc" },
    });

    const sourceHealthRows = await prisma.sourceHealth.findMany({
      where: {
        source: {
          in: Array.from(new Set(correlations.map((correlation) => correlation.event.source))),
        },
      },
      select: {
        source: true,
        feedUrl: true,
        status: true,
        lastFetchedAt: true,
        lastSucceededAt: true,
        lastError: true,
        lastLatencyMs: true,
        failureCount: true,
        successCount: true,
        updatedAt: true,
      },
    });

    const sourceHealth = summarizeSourceHealth(sourceHealthRows);
    const enrichedCorrelations = correlations.map((correlation) => {
      const intelligence = summarizeEventIntelligence({
        title: correlation.event.title,
        summary: correlation.event.summary,
        region: correlation.event.region,
        category: correlation.event.category,
        severity: correlation.event.severity,
        publishedAt: correlation.event.publishedAt,
        supportingSourcesCount: correlation.event.supportingSourcesCount,
        sourceReliability: correlation.event.sourceReliability ?? undefined,
        symbols: [normalizedSymbol],
      });

      return {
        ...correlation,
        event: {
          ...correlation.event,
          category: intelligence.category,
          whyThisMatters: intelligence.whyThisMatters,
          reliability: buildEventReliability({
            source: correlation.event.source,
            supportingSourcesCount: correlation.event.supportingSourcesCount,
            sourceReliability: correlation.event.sourceReliability,
            intelligenceQuality: intelligence.intelligenceQuality,
            publishedAt: correlation.event.publishedAt,
            sourceHealth: matchSourceHealth(sourceHealth.sources, correlation.event.source),
          }),
        },
      };
    });

    const totalEvents = enrichedCorrelations.length;
    const upCount = enrichedCorrelations.filter((correlation) => correlation.impactDirection === "up").length;
    const downCount = enrichedCorrelations.filter((correlation) => correlation.impactDirection === "down").length;
    const dominantDirection = upCount === downCount ? "Mixed" : upCount > downCount ? "Bullish" : "Bearish";
    const avgSeverity = totalEvents
      ? enrichedCorrelations.reduce((sum, correlation) => sum + correlation.event.severity, 0) / totalEvents
      : 0;

    res.status(200).json({
      symbol: normalizedSymbol,
      summary: {
        totalEvents,
        avgSeverity,
        upCount,
        downCount,
        dominantDirection,
        patternConfidence: patterns[0] ? Math.round(patterns[0].confidence * 100) : 0,
      },
      correlations: enrichedCorrelations,
      patterns,
    });
  } catch {
    sendPublicApiError(res, "Unable to load this asset right now.");
  }
}
