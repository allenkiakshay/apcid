"use server";
import { PrismaClient } from "@/generated/prisma";
import { extractDataFromToken } from "@/lib/jwttoken";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const prisma = new PrismaClient();
  try {
    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 401 });
    }

    const tokenData = extractDataFromToken(token);

    if (!tokenData || typeof tokenData !== "object" || !("user" in tokenData)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const fetched_user = await prisma.user.findUnique({
      where: { hallticket: (tokenData as { user: { hallticket: string } }).user.hallticket },
    });

    if (!fetched_user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const textSubmitted = await prisma.textFile.findUnique({
      where: { userId: fetched_user.id },
    });

    if (textSubmitted) {
      return NextResponse.json(
        { message: "Text file already submitted" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Not Submitted" }, { status: 200 });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
