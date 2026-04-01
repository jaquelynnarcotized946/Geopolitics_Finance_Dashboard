import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";
import { ingestEvents } from "../../lib/ingest/events";
import { applyPublicReadGuard } from "../../lib/publicApi";

// Allow up to 300s (Vercel caps to plan max: 60s Hobby, 300s Pro)
export const config = { maxDuration: 300 };

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Lightweight endpoint the frontend calls when it detects stale data.
 * Runs the full ingestion pipeline in its own serverless invocation so
 * it won't be killed prematurely (unlike fire-and-forget in /api/status).
 *
 * Rate-limited to prevent abuse.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Tight rate limit: max 4 requests per 30 minutes per IP
  if (
    !(await applyPublicReadGuard({
      req,
      res,
      namespace: "auto-sync",
      limit: 4,
      windowMs: 30 * 60 * 1000,
      cacheControl: "no-store",
    }))
  ) {
    return;
  }

  try {
    // Check if an ingestion is legitimately running (started < 5 min ago).
    // Logs stuck in "running" for > 5 min were killed by the serverless runtime
    // and should be cleaned up, not block future runs.
    const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
    const runningLog = await prisma.ingestionLog.findFirst({
      where: { status: "running" },
      orderBy: { startedAt: "desc" },
    });

    if (runningLog) {
      const runningAge = Date.now() - runningLog.startedAt.getTime();
      if (runningAge < STUCK_THRESHOLD_MS) {
        // Legitimately running — don't start another
        res.status(200).json({ skipped: true, reason: "ingestion_running" });
        return;
      }
      // Stuck "running" log — mark it as failed so it doesn't block us
      await prisma.ingestionLog.update({
        where: { id: runningLog.id },
        data: {
          status: "failed",
          error: "Timed out (killed by serverless runtime)",
          completedAt: new Date(),
        },
      });
    }

    // Check if data is actually stale
    const lastCompleted = await prisma.ingestionLog.findFirst({
      where: { completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    });

    const lastCompletedMs = lastCompleted?.completedAt?.getTime() ?? 0;
    if (Date.now() - lastCompletedMs < STALE_THRESHOLD_MS) {
      res.status(200).json({ skipped: true, reason: "data_fresh" });
      return;
    }

    // Run ingestion — this awaits fully in its own serverless invocation
    const result = await ingestEvents();
    res.status(200).json({ ok: true, ingested: result.count, errors: result.errors });
  } catch (error) {
    res.status(500).json({ error: "Ingestion failed" });
  }
}

