import type { NextApiRequest, NextApiResponse } from "next";
import { ingestEvents } from "../../../lib/ingest/events";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const result = await ingestEvents();
    res.status(200).json({ ok: true, ingested: result.count, errors: result.errors });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
