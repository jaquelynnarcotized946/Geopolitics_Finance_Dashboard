import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const take = Math.min(Number(req.query.take) || 50, 200);
  const severity = Number(req.query.severity) || 0;
  const region = req.query.region as string | undefined;

  const where: Record<string, unknown> = {};
  if (severity > 0) where.severity = { gte: severity };
  if (region) where.region = region;

  const events = await prisma.event.findMany({
    orderBy: { publishedAt: "desc" },
    take,
    where,
    include: {
      correlations: {
        select: {
          id: true,
          symbol: true,
          impactScore: true,
          impactDirection: true,
          impactMagnitude: true,
          window: true,
        },
      },
    },
  });

  res.status(200).json({ events });
}
