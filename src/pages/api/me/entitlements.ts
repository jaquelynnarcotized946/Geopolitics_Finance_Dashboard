import type { NextApiRequest, NextApiResponse } from "next";
import { ensureDefaultEntitlements, getEntitlementSnapshot } from "../../../lib/entitlements";
import { requireApiUser } from "../../../lib/serverAuth";
import { prisma } from "../../../lib/prisma";
import { isAdminEmail } from "../../../lib/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = await requireApiUser(req, res);
  if (!currentUser) {
    return;
  }
  const { user } = currentUser;

  await ensureDefaultEntitlements(user.id);
  const snapshot = await getEntitlementSnapshot(user.id);

  // Get user's subscription info for trial tracking
  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
  });

  // Get total registered users count
  const registeredUsers = await prisma.user.count();

  // Return snapshot with additional trial info
  res.status(200).json({
    ...snapshot,
    trialEnd: subscription?.trialEnd,
    registeredUsers,
    isAdmin: isAdminEmail(user.email),
  });
}
