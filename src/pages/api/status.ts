import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { startScheduler } from "../../lib/ingest/scheduler";
import { applyPublicReadGuard, sendPublicApiError } from "../../lib/publicApi";
import { ingestEvents } from "../../lib/ingest/events";

// Vercel uses vercel.json cron jobs. Keep the in-process scheduler for self-hosted runtimes only.
if (process.env.VERCEL !== "1") {
  startScheduler();
}

const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

/** Fire-and-forget: trigger ingestion if the last sync is stale (>2 hours). */
async function maybeAutoSync() {
  try {
    const lastLog = await prisma.ingestionLog.findFirst({
      orderBy: { startedAt: "desc" },
      select: { completedAt: true, status: true },
    });

    // If there's a running ingestion, skip
    if (lastLog?.status === "running") return;

    const lastCompletedAt = lastLog?.completedAt?.getTime() ?? 0;
    if (Date.now() - lastCompletedAt > AUTO_SYNC_INTERVAL_MS) {
      // Fire and forget — don't await so the status response returns immediately
      ingestEvents().catch(() => {
        /* swallow errors; the ingestion log table records failures */
      });
    }
  } catch {
    /* best-effort */
  }
}

function normalizeLastJob(
  lastLog: {
    id: string;
    status: string;
    eventsFound: number;
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
  } | null,
  lastJob: {
    id: string;
    kind: string;
    stage: string | null;
    status: string;
    itemsProcessed: number;
    startedAt: Date;
    completedAt: Date | null;
    error: string | null;
  } | null
) {
  if (!lastLog && !lastJob) return null;

  if (!lastJob) {
    return {
      id: `log:${lastLog!.id}`,
      kind: "ingestion",
      stage: lastLog!.status === "success" ? "completed" : "ingest",
      status: lastLog!.status,
      itemsProcessed: lastLog!.eventsFound,
      startedAt: lastLog!.startedAt,
      completedAt: lastLog!.completedAt,
      error: lastLog!.error,
      derived: true,
    };
  }

  if (lastLog && lastJob.startedAt < lastLog.startedAt) {
    return {
      id: `log:${lastLog.id}`,
      kind: "ingestion",
      stage: lastLog.status === "success" ? "completed" : "ingest",
      status: lastLog.status,
      itemsProcessed: lastLog.eventsFound,
      startedAt: lastLog.startedAt,
      completedAt: lastLog.completedAt,
      error: lastLog.error,
      derived: true,
    };
  }

  return {
    ...lastJob,
    derived: false,
  };
}

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
      namespace: "status-read",
      limit: 120,
      windowMs: 60 * 1000,
      cacheControl: "public, s-maxage=15, stale-while-revalidate=60",
    }))
  ) {
    return;
  }

  // Kick off auto-sync in the background (fire-and-forget) if data is stale
  maybeAutoSync();

  try {
    const [lastLog, lastCompletedLog, rawLastJob, eventCount, correlationCount, patternCount, recentEvents, degradedSources] = await Promise.all([
      prisma.ingestionLog.findFirst({
        orderBy: { startedAt: "desc" },
      }),
      // Also fetch the most recent *completed* ingestion so sync time is never "never"
      // when a new run is still in progress.
      prisma.ingestionLog.findFirst({
        where: { completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
      }),
      prisma.ingestionJob.findFirst({
        orderBy: { startedAt: "desc" },
      }),
      prisma.event.count(),
      prisma.correlation.count(),
      prisma.pattern.count(),
      prisma.event.count({
        where: {
          publishedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.sourceHealth.count({
        where: {
          status: { in: ["degraded", "failed"] },
        },
      }),
    ]);

    const lastJob = normalizeLastJob(lastLog, rawLastJob);

    // Use the current log's completedAt, but fall back to the most recent
    // *completed* ingestion so "Synced" never shows "never" while a run is in progress.
    const effectiveCompletedAt = lastLog?.completedAt ?? lastCompletedLog?.completedAt ?? null;

    res.status(200).json({
      lastIngestion: lastLog
        ? {
            status: lastLog.status,
            eventsFound: lastLog.eventsFound,
            startedAt: lastLog.startedAt,
            completedAt: effectiveCompletedAt,
            error: lastLog.error,
          }
        : null,
      lastJob,
      stats: {
        totalEvents: eventCount,
        recentEvents24h: recentEvents,
        totalCorrelations: correlationCount,
        totalPatterns: patternCount,
        degradedSources,
      },
    });
  } catch {
    sendPublicApiError(res, "Unable to load system status right now.");
  }
}
