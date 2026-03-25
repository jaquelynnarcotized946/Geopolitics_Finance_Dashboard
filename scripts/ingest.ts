/**
 * Standalone ingestion script.
 * Can be run via: npx tsx scripts/ingest.ts
 * Or scheduled via Windows Task Scheduler / cron.
 */

import { PrismaClient } from "@prisma/client";

// Set up environment
process.env.DATABASE_URL = process.env.DATABASE_URL || "file:./prisma/dev.db";

async function main() {
  console.log("[Ingest] Starting at", new Date().toISOString());

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const secret = process.env.CRON_SECRET || "";

  try {
    const res = await fetch(`${baseUrl}/api/cron/ingest`, {
      headers: { "x-cron-secret": secret },
    });

    if (!res.ok) {
      console.error("[Ingest] HTTP error:", res.status, await res.text());
      process.exit(1);
    }

    const data = await res.json();
    console.log("[Ingest] Complete:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("[Ingest] Failed:", (err as Error).message);
    console.log("[Ingest] Make sure the dev server is running (npm run dev)");
    process.exit(1);
  }
}

main();
