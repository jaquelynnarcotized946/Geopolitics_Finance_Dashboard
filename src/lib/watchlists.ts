import { prisma } from "./prisma";

export async function getOrCreateDefaultWatchlist(userId: string) {
  const existing = await prisma.watchlist.findFirst({ where: { userId } });
  if (existing) return existing;
  return prisma.watchlist.create({
    data: {
      name: "Primary",
      userId,
    },
  });
}
