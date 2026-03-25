import type { NextApiRequest, NextApiResponse } from "next";
import { createUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    await createUser({ name, email, password });
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
