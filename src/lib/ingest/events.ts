import { prisma } from "../prisma";
import { fetchGdeltEvents } from "../sources/gdelt";
import { fetchRssEvents } from "../sources/rss";
import { generateCorrelations } from "../correlation/matchEvents";
import { aggregatePatterns } from "../correlation/patterns";
import { analyzeEventSentiments } from "../analysis/sentiment";

export async function ingestEvents() {
  const startedAt = new Date();
  let totalEvents = 0;
  const errors: string[] = [];

  // Log ingestion start
  const log = await prisma.ingestionLog.create({
    data: {
      source: "all",
      eventsFound: 0,
      status: "running",
      startedAt,
    },
  });

  try {
    // Fetch from all sources in parallel
    const [rssEvents, gdeltEvents] = await Promise.allSettled([
      fetchRssEvents(),
      fetchGdeltEvents(),
    ]);

    const rss = rssEvents.status === "fulfilled" ? rssEvents.value : [];
    if (rssEvents.status === "rejected") {
      errors.push(`RSS: ${rssEvents.reason}`);
    }

    const gdelt = gdeltEvents.status === "fulfilled" ? gdeltEvents.value : [];
    if (gdeltEvents.status === "rejected") {
      errors.push(`GDELT: ${gdeltEvents.reason}`);
    }

    // Merge and deduplicate
    const merged = [...rss, ...gdelt];
    const seen = new Set<string>();
    const unique = merged.filter((event) => {
      if (seen.has(event.url)) return false;
      seen.add(event.url);
      return true;
    });

    // Upsert events
    for (const event of unique) {
      try {
        await prisma.event.upsert({
          where: { url: event.url },
          update: {
            title: event.title,
            summary: event.summary,
            source: event.source,
            region: event.region,
            countryCode: event.countryCode,
            severity: event.severity,
            publishedAt: event.publishedAt,
          },
          create: {
            title: event.title,
            summary: event.summary,
            source: event.source,
            url: event.url,
            region: event.region,
            countryCode: event.countryCode,
            severity: event.severity,
            publishedAt: event.publishedAt,
          },
        });
        totalEvents++;
      } catch (err) {
        // Skip duplicates or malformed entries silently
      }
    }

    // Generate correlations for new events
    try {
      await generateCorrelations();
    } catch (err) {
      errors.push(`Correlations: ${(err as Error).message}`);
    }

    // Aggregate patterns
    try {
      await aggregatePatterns();
    } catch (err) {
      errors.push(`Patterns: ${(err as Error).message}`);
    }

    // Analyze sentiment for new events
    try {
      await analyzeEventSentiments();
    } catch (err) {
      errors.push(`Sentiment: ${(err as Error).message}`);
    }

    // Update log
    await prisma.ingestionLog.update({
      where: { id: log.id },
      data: {
        eventsFound: totalEvents,
        status: errors.length > 0 ? "partial" : "success",
        error: errors.length > 0 ? errors.join("; ") : null,
        completedAt: new Date(),
      },
    });

    return { count: totalEvents, errors };
  } catch (error) {
    // Update log with failure
    await prisma.ingestionLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        error: (error as Error).message,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}
