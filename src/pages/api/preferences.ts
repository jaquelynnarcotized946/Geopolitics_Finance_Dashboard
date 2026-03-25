import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { prisma } from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.email) return res.status(401).json({ error: "Unauthorized" });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return res.status(404).json({ error: "User not found" });

  if (req.method === "GET") {
    const pref = await prisma.userPreference.findUnique({ where: { userId: user.id } });
    if (!pref) {
      return res.json({
        categories: [],
        regions: [],
        symbols: [],
        onboarded: false,
      });
    }
    return res.json({
      categories: JSON.parse(pref.categories),
      regions: JSON.parse(pref.regions),
      symbols: JSON.parse(pref.symbols),
      onboarded: pref.onboarded,
    });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const { categories, regions, symbols } = req.body;

    const pref = await prisma.userPreference.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        categories: JSON.stringify(categories || []),
        regions: JSON.stringify(regions || []),
        symbols: JSON.stringify(symbols || []),
        onboarded: true,
      },
      update: {
        categories: JSON.stringify(categories || []),
        regions: JSON.stringify(regions || []),
        symbols: JSON.stringify(symbols || []),
        onboarded: true,
      },
    });

    return res.json({
      categories: JSON.parse(pref.categories),
      regions: JSON.parse(pref.regions),
      symbols: JSON.parse(pref.symbols),
      onboarded: pref.onboarded,
    });
  }

  res.setHeader("Allow", "GET, POST, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
