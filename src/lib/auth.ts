import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export async function createUser(params: { name: string; email: string; password: string }) {
  const existing = await prisma.user.findUnique({ where: { email: params.email } });
  if (existing) {
    throw new Error("Email already registered");
  }
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.create({
    data: {
      name: params.name,
      email: params.email,
      passwordHash,
    },
  });
}

export async function verifyUser(params: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: params.email } });
  if (!user) return null;
  const valid = await bcrypt.compare(params.password, user.passwordHash);
  if (!valid) return null;
  return user;
}
