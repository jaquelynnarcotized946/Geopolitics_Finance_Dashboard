import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category, symbol } = req.query;

  const where: Record<string, unknown> = {};
  if (category && typeof category === "string") where.eventCategory = category;
  if (symbol && typeof symbol === "string") where.symbol = symbol;

  const patterns = await prisma.pattern.findMany({
    where,
    orderBy: { confidence: "desc" },
    take: 50,
  });

  res.status(200).json({ patterns });
}
