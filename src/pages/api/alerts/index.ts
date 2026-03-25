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
    const alerts = await prisma.alert.findMany({ where: { userId: user.id } });
    res.status(200).json({ alerts });
    return;
  }

  if (req.method === "POST") {
    const { name, condition } = req.body as { name?: string; condition?: string };
    if (!name || !condition) {
      res.status(400).json({ error: "Missing fields" });
      return;
    }
    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        name,
        condition,
        status: "armed",
      },
    });
    res.status(201).json({ alert });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
}
