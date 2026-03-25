import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";
import { getOrCreateDefaultWatchlist } from "../../../lib/watchlists";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const watchlist = await getOrCreateDefaultWatchlist(user.id);

  if (req.method === "POST") {
    const { symbol, name, assetClass } = req.body as {
      symbol?: string;
      name?: string;
      assetClass?: string;
    };
    if (!symbol || !name || !assetClass) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }

    const item = await prisma.watchlistItem.create({
      data: {
        symbol,
        name,
        assetClass,
        watchlistId: watchlist.id,
      },
    });

    res.status(201).json({ item });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
