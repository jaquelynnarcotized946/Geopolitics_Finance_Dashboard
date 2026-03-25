import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id) {
    res.status(400).json({ error: "Missing id" });
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id },
    include: { correlations: true },
  });

  if (!event) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.status(200).json({ event });
}
