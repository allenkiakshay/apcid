// Create this file at: /pages/api/auth/logout.ts or /app/api/auth/logout/route.ts (depending on your Next.js structure)

import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth"; // Adjust path as needed
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const session = await getServerSession(req, res, authOptions);

    if (session?.user?.id) {
      // Reset the login status when user logs out
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          isLoggedIn: false,
        },
      });
    }

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
}