import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { symbol } = req.query as { symbol: string };
  if (!symbol) {
    res.status(400).json({ error: "Missing symbol" });
    return;
  }

  // Get all correlations for this symbol, including the event data
  const correlations = await prisma.correlation.findMany({
    where: { symbol: symbol.toUpperCase() },
    orderBy: { event: { publishedAt: "desc" } },
    take: 50,
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
        },
      },
    },
  });

  // Get patterns for this symbol
  const patterns = await prisma.pattern.findMany({
    where: { symbol: symbol.toUpperCase() },
    orderBy: { confidence: "desc" },
  });

  res.status(200).json({ symbol: symbol.toUpperCase(), correlations, patterns });
}
