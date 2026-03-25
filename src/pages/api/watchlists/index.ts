import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { prisma } from "../../../lib/prisma";

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

  if (req.method === "GET") {
    const lists = await prisma.watchlist.findMany({
      where: { userId: user.id },
      include: { items: true },
    });
    res.status(200).json({ watchlists: lists });
    return;
  }

  if (req.method === "POST") {
    const { name } = req.body as { name?: string };
    const list = await prisma.watchlist.create({
      data: {
        name: name || "Watchlist",
        userId: user.id,
      },
    });
    res.status(201).json({ watchlist: list });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
