import type { NextApiRequest, NextApiResponse } from "next";
import { predictForEvent } from "../../../lib/correlation/predict";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const eventId = req.query.eventId as string | undefined;
  if (!eventId) {
    res.status(400).json({ error: "eventId query parameter required" });
    return;
  }

  try {
    const predictions = await predictForEvent(eventId);
    res.status(200).json({ predictions });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
