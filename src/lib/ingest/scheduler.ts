let schedulerStarted = false;

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

/**
 * Start the background scheduler for auto-ingestion.
 * Runs every 2 hours using setInterval (no external deps).
 * Safe to call multiple times (idempotent).
 */
export function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  setInterval(async () => {
    console.log("[Scheduler] Starting auto-ingestion at", new Date().toISOString());
    try {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const secret = process.env.CRON_SECRET || "";
      const res = await fetch(`${baseUrl}/api/cron/ingest`, {
        headers: { "x-cron-secret": secret },
      });
      const data = await res.json();
      console.log("[Scheduler] Ingestion complete:", data);
    } catch (err) {
      console.error("[Scheduler] Ingestion failed:", (err as Error).message);
    }
  }, TWO_HOURS_MS);

  console.log("[Scheduler] Auto-ingestion scheduled: every 2 hours");
}
