import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { startScheduler } from "../../lib/ingest/scheduler";

// Vercel uses vercel.json cron jobs. Keep the in-process scheduler for self-hosted runtimes only.
if (process.env.VERCEL !== "1") {
  startScheduler();
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const lastLog = await prisma.ingestionLog.findFirst({
    orderBy: { startedAt: "desc" },
  });

  const eventCount = await prisma.event.count();
  const correlationCount = await prisma.correlation.count();
  const patternCount = await prisma.pattern.count();

  const recentEvents = await prisma.event.count({
    where: {
      publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  res.status(200).json({
    lastIngestion: lastLog
      ? {
          status: lastLog.status,
          eventsFound: lastLog.eventsFound,
          startedAt: lastLog.startedAt,
          completedAt: lastLog.completedAt,
          error: lastLog.error,
        }
      : null,
    stats: {
      totalEvents: eventCount,
      recentEvents24h: recentEvents,
      totalCorrelations: correlationCount,
      totalPatterns: patternCount,
    },
  });
}
